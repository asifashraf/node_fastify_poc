module.exports = function MdlSupplierBankDetails(opts) {

    const { baseModel, knexnest, guid } = opts;

    const model = baseModel('supplier_bank_details');

    const { link } = model;

    model.createSupplierBankDetails = async function createSupplierBankDetails(bankDetails) {

        const supplier  = await link('suppliers')
            .where({ id : bankDetails.id_supplier })
            .whereNull('deleted_at')
            .first('id')

        if (!supplier){
            throw new Error(`supplier_not_exists`)
        }

        const itExists = await this.doesExist((builder) => {
            builder.whereNull('deleted_at');
            builder.where('account_number', bankDetails.account_number)
        })

        if (itExists){
            throw new Error(`supplier_bank_exists`)
        }

        bankDetails.id =  guid.v4()

        const [ insertedBankDetails ] = await this.insert(bankDetails)

        return { data: { ... insertedBankDetails  } };
    }

    model.updateSupplierBankDetails = async function updateSupplierBankDetails(bankDetails) {

        const { id } = bankDetails

        bankDetails.updated_at = this.now()

        const [ updatedBankDetails ] = await this.update(bankDetails, { id, deleted_at: null })

        if (!updatedBankDetails){
            throw new Error(`supplier_bank_not_exists`)
        }

        return { data: { ...updatedBankDetails  } }

    }

    model.getAllSupplierBankDetails = async function getAllSupplierBankDetails( id_supplier, pagination ) {

        const { perPage, currentPage } = pagination;

        let _link = link
            .select(
                'sb.id as _id',
                'sb.id_supplier as _idSupplier',
                'sb.account_title as _accountTitle',
                'sb.account_number as _accountNumber',
                'sb.bank as _bank',
                'sb.iban_number as _ibanNumber',
                'sb.swift_code as _swiftCode',
                'sb.address as _address',
                'sb.active as _active',
            )
            .from('supplier_bank_details as sb')
            .where('sb.id_supplier', id_supplier)
            .whereNull('sb.deleted_at')

        _link = _link.paginate({ perPage, currentPage, isLengthAware: true });

        let result = await _link;

        result.data = knexnest.nest(result.data);

        return result;

    }

    model.deleteSupplierBankDetails = async function deleteSupplierBankDetails(id) {
        const deleted = await this.softDelete(
            {
                id,
                deleted_at: null
            },
            { active: false }
        );

        if (!deleted?.length){
            throw new Error(`supplier_bank_not_exists`)
        }

       return deleted
    }

    return model;
}
