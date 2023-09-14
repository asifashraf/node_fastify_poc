module.exports = {
  // Mutation: {
  //   async saveBankCard(root, { bankCardInput }, context) {
  //     // Check for initial validation errors
  //     const validationResult = await context.bankCard.validate(bankCardInput);
  //
  //     if (validationResult.length > 0)
  //       return {
  //         success: false,
  //         ...formatError(validationResult, bankCardInput),
  //       };
  //
  //     const bankId = await context.bankCard.save(bankCardInput);
  //     return {
  //       success: true,
  //       bankCard: await context.bankCard.getById(bankId),
  //     };
  //   },
  //   async deleteBankCard(root, { id }, context) {
  //     const deletedBankCardCount = await context.bankCard.deleteById(id);
  //     return deletedBankCardCount !== 0;
  //   },
  // },
  Query: {
    bankCard(root, { bankCardId }, context) {
      return context.bankCard.getById(bankCardId);
    },
    bankCards(root, args, context) {
      const minCharLengthForSearch = 3;
      let validRequest = true;
      if (args.searchTerm && args.searchTerm.length < minCharLengthForSearch) {
        validRequest = false;
      }
      if (validRequest) {
        return context.bankCard.searchWithName(
          args.countryId,
          args.searchTerm,
          args.bankIds,
          args.paging
        );
      }
      return [];
    },
  },
  BankCard: {
    async bank({ bankId }, args, context) {
      return context.bank.getById(bankId);
    },
  },
};
