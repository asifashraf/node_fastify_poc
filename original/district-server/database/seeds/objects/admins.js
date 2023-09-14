/* eslint-disable camelcase */

const casual = require('casual');

module.exports = () => {
  const admins = {
    'ali@cofedistrict.com': {
      id: casual.uuid,
      name: 'ali@cofedistrict.com',
      email: 'ali@cofedistrict.com',
      autho_id: 'auth0|5a6d9f5d231d97535f344829',
      picture:
        'https://s.gravatar.com/avatar/08b47484acdb952071b78f2e02695146?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fal.png',
    },
    'abraham@cofedistrict.com': {
      id: casual.uuid,
      name: 'abraham@cofedistrict.com',
      email: 'abraham@cofedistrict.com',
      autho_id: 'auth0|5c3205a1bde98c5d194f6329',
      picture:
        'https://s.gravatar.com/avatar/9b1d11f685c7ff8550492ad77d41552e?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fab.png',
    },
    'fadi@cofeapp.com': {
      id: casual.uuid,
      name: 'fadi@cofeapp.com',
      email: 'fadi@cofeapp.com',
      autho_id: 'auth0|5ca0551aa0f9ef57ad44c577',
      picture:
        'https://s.gravatar.com/avatar/cfe825092e53196d7be23475cac2081f?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Ffa.png',
    },
    'j@cofeapp.com': {
      id: casual.uuid,
      name: 'j@cofeapp.com',
      email: 'j@cofeapp.com',
      autho_id: 'auth0|5cd723e5ba74d00e185339d2',
      picture:
        'https://s.gravatar.com/avatar/ca6b3fce8e9336ac48f5b7d6af2b2368?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fja.png',
    },
    'ahmad.abdulhakeem@cofedistrict.com': {
      id: casual.uuid,
      name: 'ahmad.abdulhakeem@cofedistrict.com',
      email: 'ahmad.abdulhakeem@cofedistrict.com',
      autho_id: 'auth0|5c28914abff9345d7b645ed1',
      picture:
        'https://s.gravatar.com/avatar/4369bb09a42c124e7fdc728ae82b7f18?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fah.png',
    },
    'azzam.e@cofedistrict.com': {
      id: casual.uuid,
      name: 'azzam.e@cofedistrict.com',
      email: 'azzam.e@cofedistrict.com',
      autho_id: 'auth0|5c289212c12e3e5be73e48b5',
      picture:
        'https://s.gravatar.com/avatar/270fe92a99e7ea17aa8765387875b180?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Faz.png',
    },
    'm.ali@cofedistrict.com': {
      id: casual.uuid,
      name: 'm.ali@cofedistrict.com',
      email: 'm.ali@cofedistrict.com',
      autho_id: 'auth0|5c2893b1118d9161190e8d09',
      picture:
        'https://s.gravatar.com/avatar/0dcfe25446ca69947c4939030c2a3248?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fm.png',
    },
    'wahbah.r@cofedistrict.com': {
      id: casual.uuid,
      name: 'wahbah.r@cofedistrict.com',
      email: 'wahbah.r@cofedistrict.com',
      autho_id: 'auth0|5c2893ec0e5b5562efb7ba76',
      picture:
        'https://s.gravatar.com/avatar/e4727e3511d79c647d142e09a142fa2e?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fwa.png',
    },
    'ahmad@cofedistrict.com': {
      id: casual.uuid,
      name: 'ahmad@cofedistrict.com',
      email: 'ahmad@cofedistrict.com',
      autho_id: 'auth0|5bcd7ac54c25765e8dc77896',
      picture:
        'https://s.gravatar.com/avatar/4f49097234e2dc994022dea139d8eff1?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fah.png',
    },
    'm.refaat@cofedistrict.com': {
      id: casual.uuid,
      name: 'm.refaat@cofedistrict.com',
      email: 'm.refaat@cofedistrict.com',
      autho_id: 'auth0|5c2893d22810275b9342be08',
      picture:
        'ttps://s.gravatar.com/avatar/7325d5d1a1fc41aa86ccc0adb6eecb77?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fm.png',
    },
    'haitham.a@cofeapp.com': {
      id: casual.uuid,
      name: 'haitham.a@cofeapp.com',
      email: 'haitham.a@cofeapp.com',
      autho_id: 'auth0|5ca7940f4bd3280ebad47b60',
      picture:
        'https://s.gravatar.com/avatar/aeaf3fdcae37a5a6a1e2b61e7e110eed?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fha.png',
    },
    'bashayer@cofeapp.com': {
      id: casual.uuid,
      name: 'bashayer@cofeapp.com',
      email: 'bashayer@cofeapp.com',
      autho_id: 'auth0|5a67251d945cc42d9af6b2b0',
      picture:
        'https://s.gravatar.com/avatar/9945c9104ae56fd0bfd63b043a9fed35?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fba.png',
    },
    'omar@cofeapp.com': {
      id: casual.uuid,
      name: 'omar@cofeapp.com',
      email: 'omar@cofeapp.com',
      autho_id: 'auth0|5bd05c2ec0f7be453540a5a6',
      picture:
        'https://s.gravatar.com/avatar/4fde388b8f338bca541d25b8fecd76de?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fom.png',
    },
    'dan@one.xyz': {
      id: casual.uuid,
      name: 'dan@one.xyz',
      email: 'dan@one.xyz',
      autho_id: 'auth0|5c6a71479d1a1f2581ca5814',
      picture:
        'https://s.gravatar.com/avatar/b443ee33ce55be8128b44939c0f6b203?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fda.png',
    },
    'm.sayed@cofedistrict.com': {
      id: casual.uuid,
      name: 'm.sayed@cofedistrict.com',
      email: 'm.sayed@cofedistrict.com',
      autho_id: 'auth0|5c289372c5db266ab30b3b82',
      picture:
        'https://s.gravatar.com/avatar/c906678d2020ad1b954b4a31305f4c45?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fm.png',
    },
    'mohammad@cofeapp.com': {
      id: casual.uuid,
      name: 'mohammad@cofeapp.com',
      email: 'mohammad@cofeapp.com',
      autho_id: 'auth0|5d7e00e891b30c0c48b9626e',
      picture:
        'https://s.gravatar.com/avatar/b6eb375268c2db29d7caa41330aaed4f?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fmo.png',
    },
    'm.shehata@cofeapp.com': {
      id: casual.uuid,
      name: 'm.shehata@cofeapp.com',
      email: 'm.shehata@cofeapp.com',
      autho_id: 'auth0|5d7e01bfd50b770dcd8899ba',
      picture:
        'https://s.gravatar.com/avatar/569264c7a35e98fa57cfb015e44f80cf?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fm.png',
    },
    'm.parvez@cofeapp.com': {
      id: casual.uuid,
      name: 'm.parvez@cofeapp.com',
      email: 'm.parvez@cofeapp.com',
      autho_id: 'auth0|5d7e01efbf8d7e0de6ebeef1',
      picture:
        'https://s.gravatar.com/avatar/0bddff9151326675a7dbd0e61d9aee7a?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fm.png',
    },
    'moaz@cofedistrict.com': {
      id: casual.uuid,
      name: 'moaz@cofedistrict.com',
      email: 'moaz@cofedistrict.com',
      autho_id: 'auth0|5b69b203e54355613fd395df',
      picture:
        'https://s.gravatar.com/avatar/34ac544889417d71dd65c5c2e98e1a81?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fmo.png',
    },
    'moaz@cofeapp.com': {
      id: casual.uuid,
      name: 'moaz@cofedistrict.com',
      email: 'moaz@cofeapp.com',
      autho_id: 'auth0|5b69b203e54355613fd395df',
      picture:
        'https://s.gravatar.com/avatar/34ac544889417d71dd65c5c2e98e1a81?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fmo.png',
    },
    'saad@cofedistrict.com': {
      id: casual.uuid,
      name: 'saad@cofedistrict.com',
      email: 'saad@cofedistrict.com',
      autho_id: 'auth0|5bd715cfc5aacf214a89ac51',
      picture:
        'https://s.gravatar.com/avatar/6c17505d2849616cc34e60c859da68ae?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fsh.png',
    },
    'sheraz@cofedistrict.com': {
      id: casual.uuid,
      name: 'sheraz@cofedistrict.com',
      email: 'sheraz@cofedistrict.com',
      autho_id: 'auth0|5bf6ee70216f880728440ca6',
      picture:
        'https://s.gravatar.com/avatar/6c17505d2849616cc34e60c859da68ae?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fsh.png',
    },
    'awais@cofedistrict.com': {
      id: casual.uuid,
      name: 'awais@cofedistrict.com',
      email: 'awais@cofedistrict.com',
      autho_id: 'auth0|5bf6f58adead9e1d97e97b9b',
      picture:
        'https://s.gravatar.com/avatar/a2b385799327e4f7e62238e2d501b9b2?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Faw.png',
    },
    'saad@cofeapp.com': {
      id: casual.uuid,
      name: 'saad@cofeapp.com',
      email: 'saad@cofeapp.com',
      autho_id: 'auth0|5c569285fe291307f551fad5',
      picture:
        'https://s.gravatar.com/avatar/0fb2d60cf10d688dbc4ef5a4990740b3?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fsa.png',
    },
    'phil@one.xyz': {
      id: casual.uuid,
      name: 'phil@one.xyz',
      email: 'phil@one.xyz',
      autho_id: 'auth0|5c7e731bbeabcd24f1405dea',
      picture:
        'https://s.gravatar.com/avatar/0457198170e29819c4a11e77f2743534?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fph.png"',
    },
    'ghita@one.xyz': {
      id: casual.uuid,
      name: 'ghita@one.xyz',
      email: 'ghita@one.xyz',
      autho_id: 'auth0|5cda9dd305235911444b113f',
      picture:
        'https://s.gravatar.com/avatar/f2d1fc6a327c87888810f2e09aeeea7e?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fgh.png',
    },
    'ruxandra@one.xyz': {
      id: casual.uuid,
      name: 'ruxandra@one.xyz',
      email: 'ruxandra@one.xyz',
      autho_id: 'auth0|5daec02a5adb270c5d03ea98',
      picture:
        'https://s.gravatar.com/avatar/1cb308aa713c7a8f450fa3ccd9104ad0?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fru.png',
    },
    'ramsha+staging@one.xyz': {
      id: casual.uuid,
      name: 'ramsha@one.xyz',
      email: 'ramsha+staging@one.xyz',
      autho_id: 'auth0|5daeda613b4d090ddfb25d37',
      picture:
        'https://s.gravatar.com/avatar/dff1e62a59e2f01a57130bd174231d99?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fra.png',
    },
    'khaled@cofeapp.com': {
      id: casual.uuid,
      name: 'khaled@cofeapp.com',
      email: 'khaled@cofeapp.com',
      autho_id: 'auth0|5dac4ef5f0c1a50e0de64b65',
      picture:
        'https://s.gravatar.com/avatar/5d27d866706e5f8e6036ac730eb3d369?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fkh.png',
    },
    'naser@cofeapp.com': {
      id: casual.uuid,
      name: 'naser@cofeapp.com',
      email: 'naser@cofeapp.com',
      autho_id: 'auth0|5dc01ba569a2ab0e29f502ed',
      picture:
        'https://s.gravatar.com/avatar/be39f7b5d42d33d0e6270098da00661d?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fna.png',
    },
    'nada@cofeapp.com': {
      id: casual.uuid,
      name: 'Khairi',
      email: 'nada@cofeapp.com',
      autho_id: 'auth0|5d999d7590c6ea0dd79dc4a8',
      picture:
        'https://s.gravatar.com/avatar/10764c16542c42ecd3aec2ad89cf791a?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fkh.png',
    },
    'meshari@cofeapp.com': {
      id: casual.uuid,
      name: 'Khairi',
      email: 'meshari@cofeapp.com',
      autho_id: 'auth0|5d99ad647627920e04831c6e',
      picture:
        'https://s.gravatar.com/avatar/2e924073a830a47c1c8ad9b5e3ae8833?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fkh.png',
    },
    'ramsha@one.xyz': {
      id: casual.uuid,
      name: 'ramsha+prod@one.xyz',
      email: 'ramsha@one.xyz',
      autho_id: 'auth0|5daf038fdd877b0cbbff0cf1',
      picture:
        'https://s.gravatar.com/avatar/4dfacc592c6b9ac3a8bb4059a96a6329?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fra.png',
    },
    'abdelrahman_fmoussa@rayacorp.com': {
      id: casual.uuid,
      name: 'abdelrahman_fmoussa@rayacorp.com',
      email: 'abdelrahman_fmoussa@rayacorp.com',
      autho_id: 'auth0|5dbe64c212b88b0e0ddb4915',
      picture:
        'https://s.gravatar.com/avatar/5ce8547865344cdeb90d89d206e8af0f?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fab.png',
    },
    'ahmed_melmaksoud@rayacorp.com': {
      id: casual.uuid,
      name: 'ahmed_melmaksoud@rayacorp.com',
      email: 'ahmed_melmaksoud@rayacorp.com',
      autho_id: 'auth0|5dbe64ea12b5bb0e260ed22b',
      picture:
        'https://s.gravatar.com/avatar/1f9e2f69f56918b69524dea067d8bf45?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fah.png',
    },
    'beshoy_mhabib@rayacorp.com': {
      id: casual.uuid,
      name: 'beshoy_mhabib@rayacorp.com',
      email: 'beshoy_mhabib@rayacorp.com',
      autho_id: 'auth0|5dbe64f99c55f40e8f0516b4',
      picture:
        'https://s.gravatar.com/avatar/bb3b9fc81a9eac80b01049caa38b0629?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fbe.png',
    },
    'eman_hmuhammed@rayacorp.com': {
      id: casual.uuid,
      name: 'eman_hmuhammed@rayacorp.com',
      email: 'eman_hmuhammed@rayacorp.com',
      autho_id: 'auth0|5dbe65082813b30e240c052f',
      picture:
        'https://s.gravatar.com/avatar/52a46cc513d704592d6859f13e3002d3?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fem.png',
    },
    'mai_zahmed@rayacorp.com': {
      id: casual.uuid,
      name: 'mai_zahmed@rayacorp.com',
      email: 'mai_zahmed@rayacorp.com',
      autho_id: 'auth0|5dbe6521c302260e2ac0e81d',
      picture:
        'https://s.gravatar.com/avatar/ee841e9a082392cd0783e43b413c2ce0?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fma.png',
    },
    'malek_mmashhadi@rayacorp.com': {
      id: casual.uuid,
      name: 'malek_mmashhadi@rayacorp.com',
      email: 'malek_mmashhadi@rayacorp.com',
      autho_id: 'auth0|5dbe653269a2ab0e29f4edfa',
      picture:
        'https://s.gravatar.com/avatar/1d765f7efc6c5ec17031a02b4c574468?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fma.png',
    },
    'marina_mgad@rayacorp.com': {
      id: casual.uuid,
      name: 'marina_mgad@rayacorp.com',
      email: 'marina_mgad@rayacorp.com',
      autho_id: 'auth0|5dbe654069a2ab0e29f4edfb',
      picture:
        'https://s.gravatar.com/avatar/798d65b098c961f6bba2f74b3a0e998a?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fma.png',
    },
    'nour_ehussin@rayacorp.com': {
      id: casual.uuid,
      name: 'nour_ehussin@rayacorp.com',
      email: 'nour_ehussin@rayacorp.com',
      autho_id: 'auth0|5dbe654d2813b30e240c0531',
      picture:
        'https://s.gravatar.com/avatar/f134a381b86b814eb750402be34743cd?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fno.png',
    },
    'nourhan_hmohammed@rayacorp.com': {
      id: casual.uuid,
      name: 'nourhan_hmohammed@rayacorp.com',
      email: 'nourhan_hmohammed@rayacorp.com',
      autho_id: 'auth0|5dbe655a4283d20e80a7dad3',
      picture:
        'https://s.gravatar.com/avatar/9a1c2d922d997cb8a67c9af41ccce9c0?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fno.png',
    },
    'salah_asalah@rayacorp.com': {
      id: casual.uuid,
      name: 'salah_asalah@rayacorp.com',
      email: 'salah_asalah@rayacorp.com',
      autho_id: 'auth0|5dbe656a9c55f40e8f0516b5',
      picture:
        'https://s.gravatar.com/avatar/468cf364578934f309f05982bbfe233c?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fsa.png',
    },
    'sara_asaber@rayacorp.com': {
      id: casual.uuid,
      name: 'sara_asaber@rayacorp.com',
      email: 'sara_asaber@rayacorp.com',
      autho_id: 'auth0|5dbe65792106640e305bb676',
      picture:
        'https://s.gravatar.com/avatar/11cf48ae0bd18619fcf865491bceceec?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fsa.png',
    },
    'yasmin_gabdelhamid@rayacorp.com': {
      id: casual.uuid,
      name: 'yasmin_gabdelhamid@rayacorp.com',
      email: 'yasmin_gabdelhamid@rayacorp.com',
      autho_id: 'auth0|5dbe65c225b7810e65776f41',
      picture:
        'https://s.gravatar.com/avatar/41601f2d36dfd27afc103fdf6674fbd6?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fya.png',
    },
    'abdelrahman_amostafa@rayacorp.com': {
      id: casual.uuid,
      name: 'abdelrahman_amostafa@rayacorp.com',
      email: 'abdelrahman_amostafa@rayacorp.com',
      autho_id: 'auth0|5df1fbad5086120e70dec4af',
      picture:
        'https://s.gravatar.com/avatar/e735522f361862026602d27edaad718c?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fab.png',
    },
    'mohamed_mgaber@rayacorp.com': {
      id: casual.uuid,
      name: 'mohamed_mgaber@rayacorp.com',
      email: 'mohamed_mgaber@rayacorp.com',
      autho_id: 'auth0|5df1fbcf06045e0e7c7e436c',
      picture:
        'https://s.gravatar.com/avatar/b0ce0c36da6102131a3fd39efa3daea4?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fmo.png',
    },
    'ahmed_aelazab@rayacorp.com': {
      id: casual.uuid,
      name: 'ahmed_aelazab@rayacorp.com',
      email: 'ahmed_aelazab@rayacorp.com',
      autho_id: 'auth0|5df1fbe11dfffc0e99623db9',
      picture:
        'https://s.gravatar.com/avatar/fcce844cb4e94e133363615239ae4f37?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fah.png',
    },
    'eman_gtawfiq@rayacorp.com': {
      id: casual.uuid,
      name: 'eman_gtawfiq@rayacorp.com',
      email: 'eman_gtawfiq@rayacorp.com',
      autho_id: 'auth0|5df1fc2307a1430e845d99c6',
      picture:
        'https://s.gravatar.com/avatar/41ffea0e38985b1a30d5e370b98bcddd?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fem.png',
    },
    'mohamed_gismail@rayacorp.com': {
      id: casual.uuid,
      name: 'mohamed_gismail@rayacorp.com',
      email: 'mohamed_gismail@rayacorp.com',
      autho_id: 'auth0|5df1fc361dfffc0e99623dbd',
      picture:
        'https://s.gravatar.com/avatar/82c48639e236166c0fe1d834678bb7d9?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fmo.png',
    },
    'madonna_ngaber@rayacorp.com': {
      id: casual.uuid,
      name: 'madonna_ngaber@rayacorp.com',
      email: 'madonna_ngaber@rayacorp.com',
      autho_id: 'auth0|5df1fc4acde26d0da6c22e8d',
      picture:
        'https://s.gravatar.com/avatar/fadb6b0000f08f2b1a6455a732399a23?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fma.png',
    },
    'abdelrhaman_mhamed@rayacorp.com': {
      id: casual.uuid,
      name: 'abdelrhaman_mhamed@rayacorp.com',
      email: 'abdelrhaman_mhamed@rayacorp.com',
      autho_id: 'auth0|5df1fc7666e2780ccd8d842a',
      picture:
        'https://s.gravatar.com/avatar/46580fca2badeaae8a4d9d8c213e0546?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fab.png',
    },
    'eman_seid@rayacorp.com': {
      id: casual.uuid,
      name: 'eman_seid@rayacorp.com',
      email: 'eman_seid@rayacorp.com',
      autho_id: 'auth0|5df1fd22c9bc0d0e7a22e6a6',
      picture:
        'https://s.gravatar.com/avatar/a2ccfc3202e20b11505afaa2c95aae84?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fem.png',
    },
    'karim_mwaheb@rayacorp.com': {
      id: casual.uuid,
      name: 'karim_mwaheb@rayacorp.com',
      email: 'karim_mwaheb@rayacorp.com',
      autho_id: 'auth0|5df1fd388ff45d0e7b13f8bd',
      picture:
        'https://s.gravatar.com/avatar/5f89dc0ab005b1e1363afa5f9b8d6736?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fka.png',
    },
    'mahmoud_adel@rayacorp.com': {
      id: casual.uuid,
      name: 'mahmoud_adel@rayacorp.com',
      email: 'mahmoud_adel@rayacorp.com',
      autho_id: 'auth0|5dbe65d04283d20e80a7dad9',
      picture:
        'https://s.gravatar.com/avatar/78676d59ba51403976b8476daf1fe7a2?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fma.png',
    },
    'mohamed_eabbas@rayacorp.com': {
      id: casual.uuid,
      name: 'mohamed_eabbas@rayacorp.com',
      email: 'mohamed_eabbas@rayacorp.com',
      autho_id: 'auth0|5dbe65dd69a2ab0e29f4edff',
      picture:
        'https://s.gravatar.com/avatar/3a1aad7d073760a7f610263aab9afc9d?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fmo.png',
    },
    'islam_hsobhy@rayacorp.com': {
      id: casual.uuid,
      name: 'islam_hsobhy@rayacorp.com',
      email: 'islam_hsobhy@rayacorp.com',
      autho_id: 'auth0|5dbe65eb2813b30e240c0534',
      picture:
        'https://s.gravatar.com/avatar/54f78b24b5e18b127087baa96b55788f?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fis.png',
    },
    'osama_aismail@rayacorp.com': {
      id: casual.uuid,
      name: 'osama_aismail@rayacorp.com',
      email: 'osama_aismail@rayacorp.com',
      autho_id: 'auth0|5dbe660469a2ab0e29f4ee00',
      picture:
        'https://s.gravatar.com/avatar/d769a4e71648d246ac3f8fd9828e443a?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fos.png',
    },
    'ehab_mmamdouh@rayacorp.com': {
      id: casual.uuid,
      name: 'ehab_mmamdouh@rayacorp.com',
      email: 'ehab_mmamdouh@rayacorp.com',
      autho_id: 'auth0|5dbe661112b5bb0e260ed235',
      picture:
        'https://s.gravatar.com/avatar/2758f6315e0db69bd3132810a2f7d81c?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Feh.png',
    },
    'reporting-analysis-team@rayacorp.com': {
      id: casual.uuid,
      name: 'reporting-analysis-team@rayacorp.com',
      email: 'reporting-analysis-team@rayacorp.com',
      autho_id: 'auth0|5dbe66242106640e305bb67b',
      picture:
        'https://s.gravatar.com/avatar/e48bde88b32734bb2c21fff1a136cdd7?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fre.png',
    },
    'aurel+develop@one.xyz': {
      id: casual.uuid,
      name: 'Aurel Stocheci',
      email: 'aurel+develop@one.xyz',
      autho_id: 'tflaFV06xuXS9GAmGe0d31kt62D3',
      picture:
        'https://s.gravatar.com/avatar/c8d725d1401ba61b21c7e822605f1d52?s=480',
    },
    'silviu@one.xyz': {
      id: casual.uuid,
      name: 'Silviu Marinescu',
      email: 'silviu@one.xyz',
      autho_id: '4yr4mN2kn8OgaXznGS2wKG3BR1l1',
      picture: 'https://avatars1.githubusercontent.com/u/4526726?s=480&v=4',
    },
    'faizan+develop@cofeapp.com': {
      id: casual.uuid,
      name: 'Faizan',
      email: 'faizan+develop@cofeapp.com',
      autho_id: 'cB2llXKKgVY4gluqLTeo6NGnveS2',
      picture:
        'https://ca.slack-edge.com/TQY240BDY-U017N5782HE-c98100366fc5-512',
    },
    'ege.ozbek+develop@cofeapp.com': {
      id: casual.uuid,
      name: 'Ege',
      email: 'ege.ozbek+develop@cofeapp.com',
      autho_id: 'sXXAEqdm9hO7hD9Jt4aWelfq6FB3',
      picture:
        'https://ca.slack-edge.com/TQY240BDY-U01BXUJ94P9-17a74a9c354a-512',
    },
  };

  return admins;
};
