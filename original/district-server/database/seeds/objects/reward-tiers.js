/* eslint-disable camelcase */
module.exports = rewards => {
  return {
    gold: {
      id: 'b7966b43-ab38-4551-8832-a40b1126ed02',
      reward_id: rewards.caribouReward.id,
      title: 'Gold',
      title_ar: 'Gold ar',
      logo_url:
        'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/dvv8afrimjjnc85ga5ii.png',
      required_points: '550',
      sort_order: '2',
      color: '#FFD700',
    },
    platinum: {
      id: 'ec1b7e15-74e5-4148-af3f-ecb62f710a56',
      reward_id: rewards.caribouReward.id,
      title: 'Platinum',
      title_ar: 'Platinum ar',
      logo_url:
        'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/gvop91sa3s7anwaw0ana.png',
      required_points: '1500',
      sort_order: '3',
      color: '#b76e79',
    },
    diamond: {
      id: 'afe14d67-8792-4979-862d-194bcb71e3fb',
      reward_id: rewards.caribouReward.id,
      title: 'Diamond',
      title_ar: 'Diamond ar',
      logo_url:
        'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/gfuc0xoopyxzvkb83owi.png',
      required_points: '4000',
      sort_order: '4',
      color: '#add8e6',
    },
    silver: {
      id: '4e81184a-00a4-457d-bd4e-bb0d5101c604',
      reward_id: rewards.caribouReward.id,
      title: 'Silver',
      title_ar: 'Silver ar',
      logo_url:
        'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/fsqfmtjbn6pzjpbuvha5.png',
      required_points: '200',
      sort_order: '1',
      color: '#C0C0C0',
    },
  };
};
