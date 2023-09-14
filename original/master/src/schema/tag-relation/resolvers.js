module.exports = {
  Mutation: {
    async saveTagRelation(root, { tagRelation }, context) {
      return context.tagRelation.save(tagRelation);
    },
    async deleteTagRelation(root, { id }, context) {
      return context.tagRelation.deleteById(id);
    },
  }
};
