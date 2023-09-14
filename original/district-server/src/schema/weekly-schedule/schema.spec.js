const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { weeklyScheduleDetails } = require('../../lib/test-fragments');

test('brand locations can resolve weeklySchedule', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
    brandLocation(id: "${brandLocationId}") {
      weeklySchedule { ${weeklyScheduleDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('config can resolve cofeDistrictHours (weeklySchedule)', async () => {
  const query = `{
    config {
      cofeDistrictHours { ${weeklyScheduleDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('cofe district hours weekly schedule can be saved', async () => {
  const query = `mutation {
  configurationWeeklyScheduleSave (schedule: [
    {
      day: 1,
      openAllDay: false,
      openDuration: 960,
      openTime: "01:00:00"
    },
    {
      day: 2,
      openAllDay: false,
      openDuration: 960,
      openTime: "03:00:00"
    },
    {
      day: 3,
      openAllDay: false,
      openDuration: 960,
      openTime: "12:00:00"
    },
    {
      day: 4,
      openAllDay: false,
      openDuration: 960,
      openTime: "13:00:00"
    },
    {
      day: 5,
      openAllDay: false,
      openDuration: 960,
      openTime: "14:00:00"
    },
    {
      day: 6,
      openAllDay: false,
      openDuration: 960,
      openTime: "20:00:00"
    },
    {
      day: 7,
      openAllDay: false
      openDuration: 960
      openTime: "22:00:00"
    },
  ]) {
    error
    schedule {
      id
      day
      openTime
      openDuration
      openAllDay
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('cofe district hours weekly schedule can be saved with open all day and closed days', async () => {
  const query = `mutation {
  configurationWeeklyScheduleSave (schedule: [
    {
      day: 1,
      openAllDay: false,
      openDuration: 960,
      openTime: "01:00:00"
    },
    {
      day: 2,
      openAllDay: true,
      openDuration: null,
      openTime: null
    },
    {
      day: 3,
      openAllDay: false,
      openDuration: 960,
      openTime: "12:00:00"
    },
    {
      day: 4,
      openAllDay: true,
      openDuration: null,
      openTime: null
    },
    {
      day: 6,
      openAllDay: false,
      openDuration: 960,
      openTime: "20:00:00"
    },
    {
      day: 7,
      openAllDay: false
      openDuration: 960
      openTime: "22:00:00"
    },
  ]) {
    error
    schedule {
      id
      day
      openTime
      openDuration
      openAllDay
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('whole weekly schedule can be saved', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "00:00", day: 1, openAllDay: true, openDuration: 1440},
  	{openTime: "09:00", day: 2, openAllDay: false, openDuration: 480}
    {openTime: "10:00", day: 3, openAllDay: false, openDuration: 480}
    {openTime: "11:00", day: 4, openAllDay: false, openDuration: 480}
    {openTime: "12:00", day: 5, openAllDay: false, openDuration: 480}
    {openTime: "07:00", day: 6, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 7, openAllDay: false, openDuration: 480}
  	]) {
  	error
  	schedule {
    openTime
    openAllDay
    openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('overlapping schedules are rejected', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "04:00", day: 1, openAllDay: false, openDuration: 480},
  	{openTime: "06:00", day: 2, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 3, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 4, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 5, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 6, openAllDay: false, openDuration: 480}
    {openTime: "22:00", day: 7, openAllDay: false, openDuration: 480}
  	]) {
  	error
  	schedule {
      openTime
      openAllDay
      openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('schedules longer than 24 hours are allowed if they do not overlap', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "02:00", day: 1, openAllDay: false, openDuration: ${26 * 60}},
  	{openTime: "06:00", day: 2, openAllDay: false, openDuration: ${8 * 60}}
  	]) {
  	error
  	schedule {
      openTime
      openAllDay
      openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('adjacent schedules are accepted', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "04:00", day: 1, openAllDay: false, openDuration: 480},
  	{openTime: "06:00", day: 2, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 3, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 4, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 5, openAllDay: false, openDuration: 480}
    {openTime: "06:00", day: 6, openAllDay: false, openDuration: 480}
    {openTime: "22:00", day: 7, openAllDay: false, openDuration: 240}
  	]) {
  	error
  	schedule {
      openTime
      openAllDay
      openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('schedules missing open time are rejected', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {day: 1, openAllDay: false, openDuration: 480},
  	{day: 2, openAllDay: false, openDuration: 480}
    {day: 3, openAllDay: false, openDuration: 480}
    {day: 4, openAllDay: false, openDuration: 480}
    {day: 5, openAllDay: false, openDuration: 480}
    {day: 6, openAllDay: false, openDuration: 480}
    {day: 7, openAllDay: false, openDuration: 480}
  	]) {
    error
  	schedule {
      openTime
      openAllDay
      openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('schedules missing open duration are rejected', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "04:00", day: 1, openAllDay: false},
  	{openTime: "06:00", day: 2, openAllDay: false}
    {openTime: "06:00", day: 3, openAllDay: false}
    {openTime: "06:00", day: 4, openAllDay: false}
    {openTime: "06:00", day: 5, openAllDay: false}
    {openTime: "06:00", day: 6, openAllDay: false}
    {openTime: "22:00", day: 7, openAllDay: false}
  	]) {
  	error
  	schedule {
      openTime
      openAllDay
      openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('ignores missing optional fields when openAllDay is true', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {day: 1, openAllDay: true},
  	{day: 2, openAllDay: true}
    {day: 3, openAllDay: true}
    {day: 4, openAllDay: true}
    {day: 5, openAllDay: true}
    {day: 6, openAllDay: true}
    {day: 7, openAllDay: true}
  	]) {
  	error
  	schedule {
      openTime
      openAllDay
      openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('schedules without openAllDay are allowed if otherwise complete', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "00:00", day: 1, openDuration: 1440},
  	{openTime: "09:00", day: 2, openDuration: 480}
    {openTime: "10:00", day: 3, openDuration: 480}
    {openTime: "11:00", day: 4, openDuration: 480}
    {openTime: "12:00", day: 5, openDuration: 480}
    {openTime: "07:00", day: 6, openDuration: 480}
    {openTime: "06:00", day: 7, openDuration: 480}
  	]) {
  	error
  	schedule {
    openTime
    openAllDay
    openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('overlapping schedules are rejected when mixing openAllDay with others', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "00:00", day: 1, openDuration: ${26 * 60}},
  	{day: 2, openAllDay: true}
  	]) {
  	error
  	schedule {
    openTime
    openAllDay
    openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('adjacent schedules are allowed when mixing openAllDay with others', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation {
  brandLocationWeeklyScheduleSave(brandLocationId: "${brandLocationId}", schedule: [
    {openTime: "00:00", day: 1, openDuration: ${24 * 60}},
  	{day: 2, openAllDay: true}
  	]) {
  	error
  	schedule {
    openTime
    openAllDay
    openDuration
    }
  }
}
`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
