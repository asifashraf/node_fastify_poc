module.exports = {
  // Mutation: {
  //   async saveBank(root, { bankInput }, context) {
  //     // Check for initial validation errors
  //     const validationResult = await context.bank.validate(bankInput);
  //
  //     if (validationResult.length > 0)
  //       return {
  //         success: false,
  //         ...formatError(validationResult, bankInput),
  //       };
  //
  //     let previousRecord;
  //     if (bankInput.id) {
  //       previousRecord = await context.bank.getById(bankInput.id);
  //     }
  //     const bankId = await context.bank.save(bankInput);
  //     // If we disable / enable a bank, its cards should also follow suit
  //     if (previousRecord && bankInput.status !== previousRecord.status) {
  //       await context.bankCard.setBankCardStatusByBankId(
  //         bankId,
  //         bankInput.status
  //       );
  //     }
  //     return {
  //       success: true,
  //       bank: await context.bank.getById(bankId),
  //     };
  //   },
  //   async deleteBank(root, { id }, context) {
  //     const deletedBankCount = await context.bank.deleteById(id);
  //     return deletedBankCount !== 0;
  //   },
  // },
  Query: {
    bank(root, { bankId }, context) {
      return context.bank.getById(bankId);
    },
    banks(root, args, context) {
      const minCharLengthForSearch = 3;
      let validRequest = true;
      if (args.searchTerm && args.searchTerm.length < minCharLengthForSearch) {
        validRequest = false;
      }
      if (validRequest) {
        return context.bank.searchWithName(
          args.searchTerm,
          args.countryId,
          args.paging,
          args.status
        );
      }
      return [];
    },
  },
  Bank: {
    async bankCards({ id }, args, context) {
      return context.bankCard.getAllByBankId(id);
    },
    async country({ countryId }, args, context) {
      return context.country.getById(countryId);
    },
  },
};
