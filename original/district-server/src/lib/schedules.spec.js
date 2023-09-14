const { computeOpenTimeRanges } = require('./schedules.js');
const moment = require('moment-timezone');

const platformSchedulesTwentyFourSeven = [
  { day: 1, openAllDay: true },
  { day: 2, openAllDay: true },
  { day: 3, openAllDay: true },
  { day: 4, openAllDay: true },
  { day: 5, openAllDay: true },
  { day: 6, openAllDay: true },
  { day: 7, openAllDay: true },
];

test('it computes a simple schedule', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 2, openTime: '02:00', openDuration: 10 * 60 },
  ];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );

  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T02:00:00+03:00').toISOString(),
        end: moment('2017-12-04T12:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
  };
  expect(actual).toEqual(expected);
});

test('it scans all requested days for a simple weekday schedule', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 7;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 2, openTime: '09:00', openDuration: 8 * 60 },
    { day: 3, openTime: '09:00', openDuration: 8 * 60 },
    { day: 4, openTime: '09:00', openDuration: 8 * 60 },
    { day: 5, openTime: '09:00', openDuration: 8 * 60 },
    { day: 6, openTime: '09:00', openDuration: 8 * 60 },
  ];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-05T09:00:00+03:00').toISOString(),
        end: moment('2017-12-05T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-06T09:00:00+03:00').toISOString(),
        end: moment('2017-12-06T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-07T09:00:00+03:00').toISOString(),
        end: moment('2017-12-07T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-08T09:00:00+03:00').toISOString(),
        end: moment('2017-12-08T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-10T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-10T24:00:00+03:00').toISOString(),
      },
    ],
  };

  expect(actual).toEqual(expected);
});

test('it scans all requested weeks for a simple weekday schedule', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 14;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 2, openTime: '09:00', openDuration: 8 * 60 },
    { day: 3, openTime: '09:00', openDuration: 8 * 60 },
    { day: 4, openTime: '09:00', openDuration: 8 * 60 },
    { day: 5, openTime: '09:00', openDuration: 8 * 60 },
    { day: 6, openTime: '09:00', openDuration: 8 * 60 },
  ];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-05T09:00:00+03:00').toISOString(),
        end: moment('2017-12-05T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-06T09:00:00+03:00').toISOString(),
        end: moment('2017-12-06T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-07T09:00:00+03:00').toISOString(),
        end: moment('2017-12-07T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-08T09:00:00+03:00').toISOString(),
        end: moment('2017-12-08T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-11T09:00:00+03:00').toISOString(),
        end: moment('2017-12-11T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-12T09:00:00+03:00').toISOString(),
        end: moment('2017-12-12T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-13T09:00:00+03:00').toISOString(),
        end: moment('2017-12-13T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-14T09:00:00+03:00').toISOString(),
        end: moment('2017-12-14T17:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-15T09:00:00+03:00').toISOString(),
        end: moment('2017-12-15T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-17T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-17T24:00:00+03:00').toISOString(),
      },
    ],
  };

  expect(actual).toEqual(expected);
});

test('it opens two hours later', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }];
  const scheduleExceptions = [
    {
      isClosed: true,
      isDeliveryClosed: true,
      isExpressDeliveryClosed: true,
      startTime: moment('2017-12-04T09:00:00+03:00').toISOString(),
      endTime: moment('2017-12-04T11:00:00+03:00').toISOString(),
    },
  ];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T11:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T09:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T11:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T09:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T11:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
  };

  expect(actual).toEqual(expected);
});

test('it closes for an entire day', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }];
  const scheduleExceptions = [
    {
      isClosed: true,
      isDeliveryClosed: true,
      isExpressDeliveryClosed: true,
      startTime: moment('2017-12-04T09:00:00+03:00').toISOString(),
      endTime: moment('2017-12-04T17:00:00+03:00').toISOString(),
    },
  ];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T09:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T17:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T09:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T17:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
  };
  expect(actual).toEqual(expected);
});

test('it closes by weekly schedule for the afternoon', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 2, openTime: '09:00', openDuration: 3 * 60 },
    { day: 2, openTime: '14:00', openDuration: 3 * 60 },
  ];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T12:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T14:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
  };
  expect(actual).toEqual(expected);
});

test('it closes by exception for the afternoon', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }];
  const scheduleExceptions = [
    {
      isClosed: true,
      isDeliveryClosed: true,
      isExpressDeliveryClosed: true,
      startTime: moment('2017-12-04T12:00:00+03:00').toISOString(),
      endTime: moment('2017-12-04T14:00:00+03:00').toISOString(),
    },
  ];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T12:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T14:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T12:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T14:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T12:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-04T14:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
  };

  expect(actual).toEqual(expected);
});

test('it closes early one day and opens late the next', () => {
  const now = moment('2017-12-04T08:00:00+00:00'); // 8AM UTC, Monday Dec 4th
  const numberOfDaysToScan = 2;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 2, openTime: '09:00', openDuration: 8 * 60 },
    { day: 3, openTime: '09:00', openDuration: 8 * 60 },
  ];
  const scheduleExceptions = [
    {
      isClosed: true,
      isDeliveryClosed: true,
      isExpressDeliveryClosed: true,
      startTime: moment('2017-12-04T14:00:00+03:00').toISOString(),
      endTime: moment('2017-12-05T12:00:00+03:00').toISOString(),
    },
  ];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T14:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-05T12:00:00+03:00').toISOString(),
        end: moment('2017-12-05T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T14:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-05T12:00:00+03:00').toISOString(),
        end: moment('2017-12-05T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T14:00:00+03:00').toISOString(),
      },
      {
        begin: moment('2017-12-05T12:00:00+03:00').toISOString(),
        end: moment('2017-12-05T24:00:00+03:00').toISOString(),
      },
    ],
  };
  expect(actual).toEqual(expected);
});

test('it handles early morning spill-overs from the day before', () => {
  const now = moment('2017-12-04T01:00:00+03:00'); // 1AM Kuwait, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 1, openTime: '14:00', openDuration: 12 * 60 },
  ];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-03T14:00:00+03:00').toISOString(),
        end: moment('2017-12-04T02:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
  };

  expect(actual).toEqual(expected);
});

test('it ignores schedules from the day before which do not spill over into today', () => {
  const now = moment('2017-12-04T01:00:00+03:00'); // 1AM Kuwait, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 1, openTime: '09:00', openDuration: 8 * 60 },
    { day: 2, openTime: '09:00', openDuration: 8 * 60 },
  ];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformSchedulesTwentyFourSeven,
    platformSchedulesTwentyFourSeven
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T00:00:00+03:00').toISOString(),
        end: moment('2017-12-04T24:00:00+03:00').toISOString(),
      },
    ],
  };

  expect(actual).toEqual(expected);
});

test('it adjusts an opening if the platform is closed at that time', () => {
  const now = moment('2017-12-04T01:00:00+03:00'); // 1AM Kuwait, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    [{ day: 2, openTime: '09:00', openDuration: 6 * 60 }],
    [{ day: 2, openTime: '09:00', openDuration: 6 * 60 }]
  );
  const expected = {
    pickup: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
    ],
    delivery: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T15:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T15:00:00+03:00').toISOString(),
      },
    ],
  };
  expect(actual).toEqual(expected);
});

test('it remains closed by weekly schedule even if the platform is open that day', () => {
  const now = moment('2017-12-04T01:00:00+03:00'); // 1AM Kuwait, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [{ day: 1, openTime: '09:00', openDuration: 8 * 60 }];
  const scheduleExceptions = [];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }],
    [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }]
  );
  const expected = {
    pickup: [],
    delivery: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
    ],
    expressDelivery: [
      {
        begin: moment('2017-12-04T09:00:00+03:00').toISOString(),
        end: moment('2017-12-04T17:00:00+03:00').toISOString(),
      },
    ],
  };

  expect(actual).toEqual(expected);
});

test('it remains closed by exception even if the platform is open that day', () => {
  const now = moment('2017-12-04T01:00:00+03:00'); // 1AM Kuwait, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }];
  const scheduleExceptions = [
    {
      isClosed: true,
      isDeliveryClosed: true,
      isExpressDeliveryClosed: true,
      startTime: moment('2017-12-04T09:00:00+03:00').toISOString(),
      endTime: moment('2017-12-05T17:00:00+03:00').toISOString(),
    },
  ];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }],
    [{ day: 2, openTime: '09:00', openDuration: 8 * 60 }]
  );
  const expected = {
    pickup: [],
    delivery: [],
    expressDelivery: [],
  };
  expect(actual).toEqual(expected);
});

test('it remains closed by a lengthy exception even if the platform is open that day', () => {
  const now = moment('2017-12-14T12:00:00+03:00'); // 1AM Kuwait, Monday Dec 4th
  const numberOfDaysToScan = 1;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 1, openTime: '09:00', openDuration: 8 * 60 },
    { day: 2, openTime: '09:00', openDuration: 8 * 60 },
    { day: 3, openTime: '09:00', openDuration: 8 * 60 },
    { day: 4, openTime: '09:00', openDuration: 8 * 60 },
    { day: 5, openTime: '09:00', openDuration: 8 * 60 },
    { day: 6, openTime: '09:00', openDuration: 8 * 60 },
    { day: 7, openTime: '09:00', openDuration: 8 * 60 },
  ];
  const platformHours = weeklySchedules;
  const scheduleExceptions = [
    {
      isClosed: true,
      isDeliveryClosed: true,
      isExpressDeliveryClosed: true,
      startTime: moment('2017-12-11T00:00:00+03:00').toISOString(),
      endTime: moment('2017-12-17T23:59:59+03:00').toISOString(),
    },
  ];
  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    scheduleExceptions,
    platformHours,
    platformHours
  );
  const expected = {
    pickup: [],
    delivery: [],
    expressDelivery: [],
  };
  expect(actual).toEqual(expected);
});

test('platform is closed all week but locations accept pickup orders', () => {
  const now = moment('2010-02-01T12:00:00+03:00'); // 1AM Kuwait, Monday Dec 4th
  const numberOfDaysToScan = 7;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [
    { day: 1, openTime: '09:00', openDuration: 8 * 60 },
    { day: 2, openTime: '09:00', openDuration: 8 * 60 },
    { day: 3, openTime: '09:00', openDuration: 8 * 60 },
    { day: 4, openTime: '09:00', openDuration: 8 * 60 },
    { day: 5, openTime: '09:00', openDuration: 8 * 60 },
    { day: 6, openTime: '09:00', openDuration: 8 * 60 },
    { day: 7, openTime: '09:00', openDuration: 8 * 60 },
  ];

  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    [],
    [], // this means the platform is closed
    [] // this means the platform is closed
  );

  const expected = {
    pickup: [
      {
        begin: '2010-02-01T06:00:00.000Z',
        end: '2010-02-01T14:00:00.000Z',
      },
      {
        begin: '2010-02-02T06:00:00.000Z',
        end: '2010-02-02T14:00:00.000Z',
      },
      {
        begin: '2010-02-03T06:00:00.000Z',
        end: '2010-02-03T14:00:00.000Z',
      },
      {
        begin: '2010-02-04T06:00:00.000Z',
        end: '2010-02-04T14:00:00.000Z',
      },
      {
        begin: '2010-02-05T06:00:00.000Z',
        end: '2010-02-05T14:00:00.000Z',
      },
      {
        begin: '2010-02-06T06:00:00.000Z',
        end: '2010-02-06T14:00:00.000Z',
      },
      {
        begin: '2010-02-07T06:00:00.000Z',
        end: '2010-02-07T14:00:00.000Z',
      },
    ],
    delivery: [],
    expressDelivery: [],
  };

  expect(actual).toEqual(expected);
});

test('location is open from 10pm - 6am, platform open 2 am - 10 am', () => {
  const now = moment('2010-02-01T12:00:00+03:00');
  const numberOfDaysToScan = 7;
  const brandLocationTimeZoneName = 'Asia/Kuwait';
  const weeklySchedules = [{ day: 2, openTime: '22:00', openDuration: 8 * 60 }];
  const platformHours = [{ day: 3, openTime: '02:00', openDuration: 8 * 60 }];

  const actual = computeOpenTimeRanges(
    now,
    numberOfDaysToScan,
    brandLocationTimeZoneName,
    weeklySchedules,
    [],
    platformHours,
    platformHours
  );

  const expected = {
    pickup: [
      {
        begin: '2010-02-01T19:00:00.000Z',
        end: '2010-02-02T03:00:00.000Z',
      },
    ],
    delivery: [
      {
        begin: '2010-02-01T23:00:00.000Z',
        end: '2010-02-02T07:00:00.000Z',
      },
    ],
    expressDelivery: [
      {
        begin: '2010-02-01T23:00:00.000Z',
        end: '2010-02-02T07:00:00.000Z',
      },
    ],
  };
  expect(actual).toEqual(expected);
});
