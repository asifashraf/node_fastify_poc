const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { pick, forEach, map } = require('lodash');
// const { isTest } = require('../../../config');
const QueryHelper = require('../../lib/query-helper');
const {
  getUserInfoByEmailFireBase,
  // auth0Permissions,
} = require('../../lib/auth');
const { addLocalizationField } = require('../../lib/util');
const cryptoRandomString = require('crypto-random-string');
const {
  brandAdminError,
  resetAdminPasswordError,
  statusTypes,
  // adminRegisterError,
  adminDetailsPayloadError,
} = require('../root/enums');
const { FirebaseScrypt } = require('firebase-scrypt');
const scrypt = new FirebaseScrypt(require('../../../config').firebaseScrypt);
const firebase = require('../../lib/firebase');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

class Admin extends BaseModel {
  constructor(db, context) {
    super(db, 'admins', context);
    this.loaders = createLoaders(this);
  }

  async validateAuth0Register() {
    const errors = [];
    const errorDescription = '';
    // const groupsPromises = [];
    // let CSEGroupInput;
    // let alreadyAdmin = false;
    // let alreadyCSE = false;
    // let groupsInput;
    // const admin = pick(input, ['id', 'email', 'groups']);
    // const emailCheckId = await this.getByField('email', admin.email);

    // admin.groups = admin.groups || [];
    // if (admin.groups.length > 0) {
    //   forEach(admin.groups, g => {
    //     if (g.deleted === false) {
    //       groupsPromises.push(this.context.group.getById(g.groupId));
    //     }
    //   });
    //   groupsInput = await Promise.all(groupsPromises);
    //   if (groupsInput.length > 0) {
    //     CSEGroupInput = find(groupsInput, r => r.name === 'CSE');
    //     if (groupsInput.length > 1) {
    //       if (CSEGroupInput) {
    //         errors.push(adminRegisterError.GROUP_CONFLICT);
    //         errorDescription = `The account can not be assigned to CSE and any other group at the same time.`;
    //         return { errors, errorDescription };
    //       }
    //     } else {
    //       // if
    //       CSEGroupInput = find(groupsInput, r => r.name === 'CSE');
    //     }
    //   }
    // }

    // const permissions = await this.context.permission.getAdminPermissions({
    //   email: admin.email,
    // });

    // const permissionList = map(permissions, n => n.name);
    // alreadyCSE = find(permissions, pl => pl.groupName === 'CSE');
    // const isCseDelFromInput = alreadyCSE
    //   ? find(
    //       admin.groups,
    //       ga => ga.groupId === alreadyCSE.groupId && ga.deleted === true
    //     )
    //   : false;
    // if (isCseDelFromInput) {
    //   alreadyCSE = false;
    // }
    // if (
    //   alreadyCSE &&
    //   permissions.length > 0 &&
    //   emailCheckId &&
    //   emailCheckId === admin.id
    // ) {
    //   errors.push(adminRegisterError.ORDER_QUEUE_ADMIN);
    //   errorDescription = `This account is an admin of brand and branch. However, it can not be assigned to any other group`;
    //   return { errors, errorDescription };
    // }

    // if (permissionList.length > 0) {
    //   alreadyAdmin = filter(permissions, pl => pl.groupName !== 'CSE');
    //   const alreadyAdminLength = [];
    //   forEach(alreadyAdmin, a => {
    //     const isDelFromInput = find(
    //       admin.groups,
    //       ga => ga.groupId === a.groupId && ga.deleted === true
    //     );

    //     if (isDelFromInput) {
    //       alreadyAdminLength.push(true);
    //     } else {
    //       alreadyAdminLength.push(false);
    //     }
    //   });

    //   if (!find(alreadyAdminLength, adl => adl === false)) {
    //     alreadyAdmin = false;
    //   }

    //   if (alreadyAdmin && CSEGroupInput) {
    //     errors.push(adminRegisterError.ALREADY_ADMIN);
    //     errorDescription = `This account is already an admin. However, it can not be assigned to CSE group`;
    //     return { errors, errorDescription };
    //   }
    // }
    // errors.push(adminRegisterError.AUTH_PROVIDER_ERROR);
    return { errors, errorDescription };
  }

  async validate(input) {
    const errors = [];

    if (input.id) {
      const admin = await this.getById(input.id);

      if (!admin) {
        errors.push(brandAdminError.NOT_EXISTS);
      }
    }

    const emailCheckId = await this.getByField('email', input.email);

    if (emailCheckId && emailCheckId !== input.id) {
      errors.push(brandAdminError.DUPLICATE_EMAIL);
    }

    return errors;
  }

  async resetPassword(adminId) {
    const errors = [];
    let authProviderPassword = null;
    let authenticationError = null;

    const admin = await this.getById(adminId);
    if (admin && admin.status === 'ACTIVE') {
      authProviderPassword = cryptoRandomString(8);
      const salt = Buffer.from(cryptoRandomString(8)).toString('base64');
      const passwordHash = scrypt.hash(authProviderPassword, salt);
      const auth0User = await getUserInfoByEmailFireBase(admin.email);
      if (auth0User.error) {
        if (auth0User.error === 'auth/user-not-found') {
          const newUser = {
            email: admin.email,
            name: admin.name,
            password: authProviderPassword,
          };
          const createdFirebaseUser = await firebase.createUser(newUser);
          const auth = await this.context.auth;
          const maskedUser = Object.assign({}, newUser);
          maskedUser.password = '******';
          const info = { 'requesterId': auth.id, 'requesterEmail': auth.email, 'newAdminUser': maskedUser };
          SlackWebHookManager.sendTextToSlack(
            'New Admin user created for reset password: ' +
            JSON.stringify(info)
          );
          await this.save({
            id: adminId,
            authoId: createdFirebaseUser.uid,
            password: await passwordHash,
            salt,
          });
        } else {
          authenticationError = auth0User.error;
          errors.push(resetAdminPasswordError.authProviderPassword);
        }
      } else {
        const user = {
          email: auth0User.email,
          password: authProviderPassword,
        };
        await firebase.updateUser(auth0User.uid, user);
        await this.save({
          id: adminId,
          password: await passwordHash,
          salt,
        });
      }
    } else {
      errors.push(resetAdminPasswordError.NOT_EXISTS);
    }

    return { admin, errors, authenticationError, authProviderPassword };
  }

  getByEmail(email) {
    return this.db(this.tableName)
      .whereRaw(`lower(email) = '${email.toLowerCase()}'`)
      .first();
  }

  async getAdminDetails(email) {
    const errors = [];
    let errorDescription = '';
    const auth = this.context.auth;
    if (!auth.email || (auth.email && auth.email !== email)) {
      errors.push(adminDetailsPayloadError.UNAUTHORIZED);
      errorDescription = 'Unauthorized Actions';
      return { error: errors[0], errors, errorDescription };
    }
    const admin = await this.db(this.tableName)
      .whereRaw(`lower(email) = '${email.toLowerCase()}' `)
      .first();
    if (!admin) {
      errors.push(adminDetailsPayloadError.NOT_FOUND);
      errorDescription = 'There is no user record corresponding to this email.';
      return { error: errors[0], errors, errorDescription };
    }
    if (admin.status !== statusTypes.ACTIVE) {
      if (admin.status === statusTypes.INACTIVE) {
        errors.push(adminDetailsPayloadError.INACTIVE);
        errorDescription = 'Your account has been deactivated. Please contact administrator.';
      }
      if (admin.status === statusTypes.DELETED) {
        errors.push(adminDetailsPayloadError.DELETED);
        errorDescription = 'Your account has been deleted. Please contact administrator.';
      }

      return { error: errors[0], errors, errorDescription };
    }

    const groupList = await this.db('group_admins')
      .select('groups.id', 'groups.name')
      .distinct('groups.name')
      // .join('groups', 'groups.id', 'group_admins.group_id')
      .joinRaw(
        `inner join groups on
          group_admins.group_id = groups.id or
          groups.id = (select group_id from nested_groups where nested_group_id = group_admins.group_id)`
      )
      .where('group_admins.admin_id', admin.id)
      .orderBy('groups.name', 'asc');

    const groupNames = map(groupList, g => g.name);
    const groupIds = map(groupList, g => g.id);
    const groupRolesList = await this.context.groupRole
      .getByGroupIds(groupIds)
      .orderBy('roles.name', 'asc')
      .select('roles.*')
      .distinct('roles.name');
    const roleNames = map(groupRolesList, gr => gr.name);
    const roleIds = map(groupRolesList, gr => gr.id);

    const rolePermissionsList = await this.context.rolePermission
      .getByRoleIds(roleIds)
      .distinct('permissions.name');
    const permissionNames = map(rolePermissionsList, rp => rp.name);
    const brand = addLocalizationField(
      await this.context.brandAdmin.getAdminBrand(admin.id),
      'name'
    );
    const brandLocation = addLocalizationField(
      await this.context.brandAdmin.getAdminBrandLocation(admin.id),
      'name'
    );

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      status: admin.status,
      picture: admin.picture,
      groups: groupNames,
      roles: roleNames,
      permissions: permissionNames,
      brand,
      brandLocation,
    };
  }

  getByAuthoId(authoId) {
    return this.db(this.tableName)
      .where('autho_id', authoId)
      .first();
  }

  getByGroupId(groupId) {
    return this.db('group_admins')
      .select('admins.*')
      .join(this.tableName, 'group_admins.admin_id', `${this.tableName}.id`)
      .where('group_admins.group_id', groupId);
  }

  async addUserToGroups(input) {
    const adminId = input.adminId;
    const groups = input.groups ? input.groups : [];

    const promisesAddDB = [];
    const promisesDelDB = [];

    const admin = await this.context.admin.getById(adminId);
    if (admin) {
      forEach(groups, async n => {
        if (n.deleted === true) {
          promisesDelDB.push(
            this.context.groupAdmin.deleteGroupAdmin(n.groupId, adminId)
          );
        } else {
          const groupAdmin = await this.context.groupAdmin.getByGroupAndAdminId(
            n.groupId,
            adminId
          );

          if (!groupAdmin) {
            promisesAddDB.push(
              this.context.groupAdmin.save({
                groupId: n.groupId,
                adminId,
              })
            );
          }
        }
      });
    }
    await Promise.all(promisesAddDB);
    await Promise.all(promisesDelDB);
    return admin;
  }

  async updateGroupAdmin(input) {
    const adminModel = pick(input, ['id', 'name', 'email', 'status']);
    const groupsToBeAdded = input.groups || [];
    const auth0User = await getUserInfoByEmailFireBase(adminModel.email);
    if (auth0User.error) {
      return auth0User.error;
    }
    adminModel.authoId = auth0User.uid;
    adminModel.picture = auth0User.photoURL;
    const adminId = await this.context.admin.save(adminModel);
    if (input.status === statusTypes.INACTIVE || input.status == statusTypes.DELETED) {
      await firebase.updateUser(auth0User.uid, { disabled: true });
      SlackWebHookManager.sendTextToSlack(
        `[!!!Admin Updated!!!]
  from : ${this.context.auth.id} (${this.context.auth.email})
  admin user : ${JSON.stringify(input)}`
      );
      const admin = await this.context.admin.getById(adminId);
      return { admin };
    } else {
      await firebase.updateUser(auth0User.uid, { disabled: false });
      SlackWebHookManager.sendTextToSlack(
        `[!!!Admin Updated!!!]
  ${this.context.auth.id} (${this.context.auth.email})
  ${JSON.stringify(input)}`
      );
    }
    const { promisesAddDB, promisesDelDB } = groupsToBeAdded.reduce(
      (result, item) => {
        const groupId = item.groupId || null;
        const deleted = item.deleted || false;
        if (deleted) {
          if (groupId && adminId) {
            result.promisesDelDB.push(
              this.context.groupAdmin.deleteGroupAdmin(groupId, adminId)
            );
          }
        } else {
          result.promisesAddDB.push(
            this.context.groupAdmin.save({
              adminId,
              groupId,
            })
          );
        }
        return result;
      },
      { promisesAddDB: [], promisesDelDB: [] }
    );

    if (promisesAddDB.length > 0) {
      await Promise.all(promisesAddDB);
    }
    if (promisesDelDB.length > 0) {
      await Promise.all(promisesDelDB);
    }

    const admin = await this.context.admin.getById(adminId);
    return { admin };
  }

  async createGroupAdmin(input) {
    const admins = [];
    const adminModel = pick(input, ['name', 'email', 'status']);
    const groupsToBeAdded = input.groups || [];
    const authProviderPassword = cryptoRandomString(8);
    const salt = Buffer.from(cryptoRandomString(8)).toString('base64');
    const passwordHash = scrypt.hash(authProviderPassword, salt);
    let auth0User = await getUserInfoByEmailFireBase(adminModel.email);
    if (auth0User.error && auth0User.error === 'auth/user-not-found') {
      const newUser = {
        email: adminModel.email,
        name: adminModel.name,
        password: authProviderPassword,
      };
      auth0User = await firebase.createUser(newUser);
      const auth = await this.context.auth;
      const maskedUser = Object.assign({}, newUser);
      maskedUser.password = '******';
      const info = { 'requesterId': auth.id, 'requesterEmail': auth.email, 'newAdminUser': maskedUser };
      SlackWebHookManager.sendTextToSlack(
        'New Admin user created for Create Group Admin: ' +
        JSON.stringify(info)
      );
      auth0User.id = auth0User.uid;
      admins.push({ newUser });
    } else if (auth0User.error) {
      return auth0User.error;
    }

    adminModel.authoId = auth0User.uid;
    adminModel.picture = auth0User.photoURL;
    const id = input.id ? input.id : null;
    if (id) {
      adminModel.id = id;
    } else {
      const existingEmail = await this.getByEmail(adminModel.email);
      if (existingEmail) {
        adminModel.id = existingEmail.id;
      }
    }
    const adminId = await this.context.admin.save({
      ...adminModel,
      salt,
      password: await passwordHash,
    });

    const promisesAddDB = [];
    const promisesDelDB = [];
    if (groupsToBeAdded.length > 0) {
      forEach(groupsToBeAdded, async el => {
        const groupId = el.groupId ? el.groupId : null;
        const deleted = el.deleted ? el.deleted : false;

        if (deleted) {
          if (groupId && adminId) {
            promisesDelDB.push(
              this.context.groupAdmin.deleteGroupAdmin(groupId, adminId)
            );
          }
        } else {
          promisesAddDB.push(
            this.context.groupAdmin.save({
              adminId,
              groupId,
            })
          );
        }
      });
    }
    if (promisesAddDB.length > 0) {
      await Promise.all(promisesAddDB);
    }
    if (promisesDelDB.length > 0) {
      await Promise.all(promisesDelDB);
    }

    const admin = await this.context.admin.getById(adminId);
    return { admin, authProviderPassword };
  }

  deleteByEmail(email) {
    return this.db(this.tableName)
      .where('email', email)
      .del();
  }

  filterAdmins(query, filters) {
    if (filters.groupId) {
      query.where('group_admins.group_id', filters.groupId);
    }
    if (filters.email) {
      query.whereRaw(`lower(admins.email) LIKE '%${filters.email}%'`);
    }
    if (typeof filters.status === 'undefined') {
      filters.status = statusTypes.ACTIVE;
    }
    if (filters.status !== 'ALL') {
      query.where('admins.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(admins.name) like ? or LOWER(admins.email) like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  async groupAdmins(email, groupId, paging, filters) {
    email = email ? email.toLowerCase().trim() : '';
    let query = this.db('group_admins')
      .distinct('admins.email')
      .select('admins.*')
      .join('admins', 'admins.id', 'group_admins.admin_id')
      .orderBy('admins.email', 'asc');
    filters = filters || {};
    filters.groupId = groupId;
    filters.email = email;
    query = this.filterAdmins(query, filters);
    // console.log(query.toString());
    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rsp.admins = rsp.items;
    return rsp.admins;
  }

  async getAllPaged(args) {
    const { email, paging } = args;
    const query = super
      .getAll()
      .select('admins.*')
      .orderBy('admins.created', 'desc');

    if (email) {
      query.where('email', email);
    }

    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rsp.admins = rsp.items;
    return rsp.admins;
  }

  async deleteAdminForBrand({ brandId, brandLocationId, email }) {
    const existingAdmin = await this.getByEmail(email);

    if (existingAdmin) {
      const bAdmin = await this.context.brandAdmin.getByAdminBrandAndLocationId(
        existingAdmin.id,
        brandId,
        brandLocationId
      );
      if (bAdmin) {
        await this.context.brandAdmin.deleteById(bAdmin.id);
        return true;
      }
    }
    return false;
  }

  async addAdminForBrand({ brandId, brandLocationId, name, email, status }) {
    let user = null;
    const authProviderPassword = cryptoRandomString(8);
    const salt = Buffer.from(cryptoRandomString(8)).toString('base64');
    const passwordHash = await scrypt.hash(authProviderPassword, salt);

    let auth0User = await getUserInfoByEmailFireBase(email);
    if (auth0User.error && auth0User.error === 'auth/user-not-found') {
      const newUser = {
        email,
        name,
        password: authProviderPassword,
        // eslint-disable-next-line camelcase
        user_metadata: {
          brandId,
          brandLocationId,
        },
      };
      auth0User = await firebase.createUser(newUser);
      const auth = await this.context.auth;
      const maskedUser = Object.assign({}, newUser);
      maskedUser.password = '******';
      const info = { 'requesterId': auth.id, 'requesterEmail': auth.email, 'newAdminUser': maskedUser };
      SlackWebHookManager.sendTextToSlack(
        'New Admin user created for Brand Admin: ' +
        JSON.stringify(info)
      );
      auth0User.id = auth0User.uid;
      user = newUser;
    } else if (auth0User.error) {
      return auth0User.error;
    }
    const adminModel = {
      name,
      email,
      authoId: auth0User.uid,
      picture: auth0User.photoURL,
      status,
      // password: await passwordHash,
      // salt,
    };
    const admin = await this.getByEmail(email);
    if (admin) {
      adminModel.id = admin.id;
    } else {
      adminModel.password = await passwordHash;
      adminModel.salt = salt;
    }

    const adminId = await this.context.admin.save({
      ...adminModel,
    });

    const bAdmin = await this.context.brandAdmin.getByAdminBrandAndLocationId(
      adminId,
      brandId,
      brandLocationId,
    );
    const brandAdminModel = {
      adminId,
      brandId,
      brandLocationId,
    };

    if (bAdmin) {
      brandAdminModel.id = bAdmin.id;
    }
    await this.context.brandAdmin.save(brandAdminModel);

    const cseGroup = await this.context.group.getByName('CSE');
    if (cseGroup) {
      await this.context.groupAdmin.save({ adminId, groupId: cseGroup.id });
    }
    return user;
  }

  async createAdminWithBrandAndLocations(input) {
    const admins = [];
    const adminModel = pick(input, ['name', 'email']);
    const brandsToBeAdded = input.brands || [];
    // if (!isTest) {

    // }
    let auth0User = await getUserInfoByEmailFireBase(adminModel.email);
    if (!auth0User) {
      const newUser = {
        email: adminModel.email,
        name: adminModel.name,
      };
      auth0User = await firebase.createUser(newUser);
      const auth = await this.context.auth;
      const maskedUser = Object.assign({}, newUser);
      maskedUser.password = '******';
      const info = { 'requesterId': auth.id, 'requesterEmail': auth.email, 'newAdminUser': maskedUser };
      SlackWebHookManager.sendTextToSlack(
        'New Admin user created for Brand Location: ' +
        JSON.stringify(info)
      );
      // eslint-disable-next-line camelcase
      admins.push({ newUser });
    }

    adminModel.authoId = auth0User.uid;
    adminModel.picture = auth0User.photoURL;

    const id = input.id ? input.id : null;
    if (id) {
      adminModel.id = id;
    }
    const adminId = await this.context.admin.save({
      ...adminModel,
    });

    if (brandsToBeAdded.length > 0) {
      forEach(brandsToBeAdded, async el => {
        const id = el.id ? el.id : null;
        const brandId = el.brandId ? el.brandId : null;
        const brandLocationId = el.brandLocationId ? el.brandLocationId : null;
        const deleted = el.deleted ? el.deleted : false;

        if (deleted) {
          if (id) {
            await this.context.brandAdmin.deleteById(id);
          }
        } else if (id) {
          await this.context.brandAdmin.save({
            id,
            adminId,
            brandId,
            brandLocationId,
          });
        }
      });
    }

    const admin = await this.context.admin.getById(adminId);
    return { admin, admins };
  }

  async validatePermissionByFilters(filters, permission) {
    // check if the admin has the same branch of orderSet
    // [attack_scope]
    if (!this.context.auth.brandAdminInfo) {
      return false;
    }
    const { brandAdminList, branchAdminList } = this.context.auth.brandAdminInfo;
    if (!this.context.auth.isVendorAdmin && brandAdminList.length == 0 && branchAdminList.length == 0) {
      const hasPermission = await this.context.orderSet.validatePermissiosByPermission(permission);
      if (hasPermission) {
        return true;
      } else {
        return false;
      }
    }
    if (filters.brandId && brandAdminList.includes(filters.brandId)) {
      return true;
    }
    if (filters.brandLocationId) {
      if (branchAdminList.includes(filters.brandLocationId)) {
        return true;
      } else {
        const brandLocation = await this.context.brandLocation.getById(filters.brandLocationId);
        if (brandAdminList.includes(brandLocation.brandId)) {
          return true;
        }
      }
    }
    return false;
  }
}

module.exports = Admin;
