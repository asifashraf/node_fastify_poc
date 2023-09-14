/* eslint-disable max-params */
const { times, filter } = require('lodash');
const moment = require('moment-timezone');

// Convenience function.
const localTimeComponents = localTimeString => {
  const components = localTimeString.split(':').map(s => parseInt(s, 10));
  return { hours: components[0], minutes: components[1] };
};

// Another convenience function used only in this file.
//
// Since a given schedule exception may affect multiple openings, and each
// affected opening requires a mutation of either the opening or the array
// of openings, we will define a local function `applyException` which can
// be called recursively until all required mutations have been applied.
const applyException = (anException, targetOpenings, exceptionType) => {
  // The following describe potential comparisons between the start/stop
  // times of a schedule exception and the begin/end times of a location
  // opening. The result of such a comparison may imply one or more required
  // actions to be taken according to that comparison.
  //
  // (For 1-4 exception.isClosed == false) for delivery (For 1-4 exception.isDeliveryClosed == false)
  //
  // 1: (stop < begin && no identical opening found already)
  //    Add an opening for the exception's time range.
  // 2: (start < begin && stop >= begin && stop < end)
  //    Set opening.begin to start.
  // 3: (start > begin && start <= end && stop > end)
  //    Set opening.end to stop.
  // 4: (start < begin && stop > end)
  //    Set opening.begin and opening.end to start and stop respectively.
  //
  // (For 5-8 exception.isClosed == true) for delivery (For 5-8 exception.isDeliveryClosed == true)
  //
  // 5: (start <= begin && stop > begin && stop < end)
  //    Set opening.begin to stop.
  // 6: (start > begin && stop < end)
  //    Add a new opening from stop to opening.end
  //    Set opening.end to start.
  // 7: (start > begin && start < end && stop>=end)
  //    Set opening.end to start.
  // 8: (start <= begin && stop >= end)
  //    Remove the opening

  let isClosed;
  switch (exceptionType) {
    case 'DELIVERY': {
      isClosed = anException.isDeliveryClosed;
      break;
    }
    case 'EXPRESS_DELIVERY': {
      isClosed = anException.isExpressDeliveryClosed;
      break;
    }
    default: {
      isClosed = anException.isClosed;
      break;
    }
  }

  const actions = {
    ADD_OPENING: 'ADD_OPENING',
    SET_OPENING_BEGIN_TO_START: 'SET_OPENING_BEGIN_TO_START',
    SET_OPENING_BEGIN_TO_STOP: 'SET_OPENING_BEGIN_TO_STOP',
    SET_OPENING_END_TO_START: 'SET_OPENING_END_TO_START',
    SET_OPENING_END_TO_STOP: 'SET_OPENING_END_TO_STOP',
    ADD_NEW_OPENING_FROM_STOP_TO_END: 'ADD_NEW_OPENING_FROM_STOP_TO_END',
    REMOVE_OPENING: 'REMOVE_OPENING',
  };

  const start = moment(anException.startTime);
  const stop = moment(anException.endTime);
  // eslint-disable-next-line complexity
  const determineActions = opening => {
    const begin = opening.begin;
    const end = opening.end;
    if (!isClosed) {
      if (stop.isBefore(begin)) {
        const match = targetOpenings.find(potentialMatch => {
          return (
            potentialMatch.begin.isSame(start) &&
            potentialMatch.end.isSame(stop)
          );
        });
        if (!match) {
          return [actions.ADD_OPENING];
        }
      } else if (
        start.isBefore(begin) &&
        stop.isSameOrAfter(begin) &&
        stop.isBefore(end)
      ) {
        return [actions.SET_OPENING_BEGIN_TO_START];
      } else if (
        start.isAfter(begin) &&
        start.isSameOrBefore(end) &&
        stop.isAfter(end)
      ) {
        return [actions.SET_OPENING_END_TO_STOP];
      } else if (start.isBefore(begin) && stop.isAfter(end)) {
        return [
          actions.SET_OPENING_BEGIN_TO_START,
          actions.SET_OPENING_END_TO_STOP,
        ];
      }
      return null;
    }
    if (isClosed) {
      if (
        start.isSameOrBefore(begin) &&
        stop.isAfter(begin) &&
        stop.isBefore(end)
      ) {
        return [actions.SET_OPENING_BEGIN_TO_STOP];
      } else if (start.isAfter(begin) && stop.isBefore(end)) {
        return [
          actions.ADD_NEW_OPENING_FROM_STOP_TO_END,
          actions.SET_OPENING_END_TO_START,
        ];
      } else if (
        start.isAfter(begin) &&
        start.isBefore(end) &&
        stop.isSameOrAfter(end)
      ) {
        return [actions.SET_OPENING_END_TO_START];
      } else if (start.isSameOrBefore(begin) && stop.isSameOrAfter(end)) {
        return [actions.REMOVE_OPENING];
      }
    }
    return null; // no disposition matched
  };
  let requiredActions = null;
  let opening = null;
  let indexOfOpening = null;
  targetOpenings.find((o, index) => {
    const ra = determineActions(o);
    if (!ra) {
      return false;
    }
    requiredActions = ra;
    opening = o;
    indexOfOpening = index;
    return true;
  });
  if (requiredActions && opening && indexOfOpening !== null) {
    requiredActions.forEach(action => {
      switch (action) {
        case actions.ADD_OPENING: {
          targetOpenings.push({ begin: start, end: stop });
          break;
        }
        case actions.SET_OPENING_BEGIN_TO_START: {
          opening.begin = start;
          break;
        }
        case actions.SET_OPENING_BEGIN_TO_STOP: {
          opening.begin = stop;
          break;
        }
        case actions.SET_OPENING_END_TO_START: {
          opening.end = start;
          break;
        }
        case actions.SET_OPENING_END_TO_STOP: {
          opening.end = stop;
          break;
        }
        case actions.ADD_NEW_OPENING_FROM_STOP_TO_END: {
          targetOpenings.push({ begin: stop, end: opening.end });
          break;
        }
        case actions.REMOVE_OPENING: {
          targetOpenings.splice(indexOfOpening, 1);
          break;
        }
        default: {
          // How did this happen?
          break;
        }
      }
    });
    // Recursively repeat since one exception may affect multiple openings.
    applyException(anException, targetOpenings, exceptionType);
  }
  // No affected opening was found, no need for a recursive call.
};

// Yet another convenience function used only in this file.
const mergeSortAndStringifyOpenings = openings => {
  // First, create an empty array to contain the merged openings.

  const mergedOpenings = [];

  // Iterate through each non-merged opening, and try to find the first opening
  // in `mergedOpenings` which is adjacent to it or overlaps it. If a match is
  // found, mutate the existing merged opening and toss the non-merged opening.
  // If a match is not found, add the non-merged opening to mergedOpenings
  // as a new member.

  openings.forEach(opening => {
    const xBegin = opening.begin;
    const xEnd = opening.end;
    const overlappingOpening = mergedOpenings.find(otherOpening => {
      const yBegin = otherOpening.begin;
      const yEnd = otherOpening.end;
      if (xBegin.isAfter(yBegin) && xBegin.isBefore(yEnd)) return true;
      if (xEnd.isAfter(yBegin) && xEnd.isBefore(yEnd)) return true;
      if (xBegin.isSame(yBegin) || xBegin.isSame(yEnd)) return true;
      if (xEnd.isSame(yBegin) || xEnd.isSame(yEnd)) return true;
      return false;
    });
    if (overlappingOpening) {
      const yBegin = overlappingOpening.begin;
      const yEnd = overlappingOpening.end;
      overlappingOpening.begin = xBegin.isBefore(yBegin) ? xBegin : yBegin;
      overlappingOpening.end = xEnd.isAfter(yEnd) ? xEnd : yEnd;
    } else {
      mergedOpenings.push(opening);
    }
  });

  // At this point, `mergedOpenings` should contain all valid openings without
  // any overlaps. But they're not sorted chronologically, so do that now.

  const sortedOpenings = mergedOpenings.sort((lhs, rhs) => {
    if (lhs.begin.isBefore(rhs.begin)) return -1;
    if (lhs.begin.isAfter(rhs.begin)) return 1;
    return 0;
  });

  // Last, map the moment values to the expected result type (ISO 8601 strings
  // in UTC time).

  const results = sortedOpenings.map(o => {
    return { begin: o.begin.toISOString(), end: o.end.toISOString() };
  });

  return results;
};

// A utility method which takes in a smorgasbörd of brand-location and platform
// scheduling data, as well as a requested time span to scan, and returns a
// BrandLocationOpenings object.
const computeOpenTimeRanges = (
  now, // a moment representing "now"
  numberOfDaysToScan, // an integer, the number of upcoming days to scan
  brandLocationTimeZoneName, // a string like 'Asia/Kuwait'
  weeklySchedules, // an array of WeeklySchedule objects
  scheduleExceptions, // an array of ScheduleException objects
  platformSchedules, // an array of WeeklySchedule objects
  expressDeliverySchedules // an array of ExpressDeliverySchedule objects
) => {
  // Set `timespanStart` to midnight of the same calendar day as `now` in the
  // brand location's time zone.
  const timespanStart = now
    .clone()
    .tz(brandLocationTimeZoneName)
    .hours(0)
    .minutes(0)
    .seconds(0)
    .milliseconds(0);
  // An array of "openings", objects with two properties: `begin` and `end`,
  // both of which are moments in the brand location's time zone. Each opening
  // represents a time period during which the brand location is scheduled
  // to be open.

  let openings = [];

  // Iterate through the requested days, starting with today, and populate the
  // `openings` array with an opening for each regularly-scheduled open period.
  // Add a day to `numberOfDaysToScan` to account for the day that will be
  // subtracted when composing `cursorMoment`.
  //
  // Also, while we're at it, create an array of "platform openings", which will
  // be used when calculating delivery hours later.

  const platformOpenings = [];
  // Bad Code incoming , copy-pasting this part because at this point only god knows how this code works
  const expressDeliveryOpenings = [];

  times(numberOfDaysToScan + 1, index => {
    // Subtract a day from `timespanStart` before advancing to the target day
    // because some weekly schedules might spill over into the following
    // weekday (e.g. an all-night place closing at 2AM), thus requiring that we
    // begin our scan the day before the requested timespan start day. Any false
    // positives will be filtered out later on below.
    const cursorMoment = timespanStart
      .clone()
      .subtract(1, 'days')
      .add(index, 'days');
    // Moment uses Sunday(0) to Saturday(6), we want Sunday(1) to Saturday(7).
    const weekDay = cursorMoment.day() + 1;
    const schedules = filter(weeklySchedules, s => s.day === weekDay);
    schedules.forEach(schedule => {
      if (schedule.openTime && schedule.openDuration) {
        const components = localTimeComponents(schedule.openTime);
        const begin = cursorMoment
          .clone()
          .hours(components.hours)
          .minutes(components.minutes)
          .seconds(0);
        const end = begin.clone().add(schedule.openDuration, 'minutes');
        openings.push({ begin, end });
      } else if (schedule.openAllDay) {
        const begin = cursorMoment
          .clone()
          .hours(0)
          .minutes(0)
          .seconds(0);
        const end = begin.clone().add(1, 'day');
        openings.push({ begin, end });
      }
    });

    const platformSchedule = platformSchedules.find(schedule => {
      return schedule.day === weekDay;
    });

    if (platformSchedule) {
      if (platformSchedule.openTime && platformSchedule.openDuration) {
        const platformComponents = localTimeComponents(
          platformSchedule.openTime
        );
        const platformOpenBegin = cursorMoment
          .clone()
          .hours(platformComponents.hours)
          .minutes(platformComponents.minutes);

        const platformOpenEnd = platformOpenBegin
          .clone()
          .add(platformSchedule.openDuration, 'minutes');

        platformOpenings.push({
          begin: platformOpenBegin,
          end: platformOpenEnd,
        });
      } else if (platformSchedule.openAllDay) {
        const platformOpenBegin = cursorMoment
          .clone()
          .hours(0)
          .minutes(0);
        const platformOpenEnd = platformOpenBegin.clone().add(1, 'day');
        platformOpenings.push({
          begin: platformOpenBegin,
          end: platformOpenEnd,
        });
      }
    }
    const expressDeliverySchedule = expressDeliverySchedules.find(schedule => {
      return schedule.day === weekDay;
    });

    if (expressDeliverySchedule) {
      if (
        expressDeliverySchedule.openTime &&
        expressDeliverySchedule.openDuration
      ) {
        const expressDeliveryComponents = localTimeComponents(
          expressDeliverySchedule.openTime
        );
        const expressDeliveryOpenBegin = cursorMoment
          .clone()
          .hours(expressDeliveryComponents.hours)
          .minutes(expressDeliveryComponents.minutes);

        const expressDeliveryOpenEnd = expressDeliveryOpenBegin
          .clone()
          .add(expressDeliverySchedule.openDuration, 'minutes');

        expressDeliveryOpenings.push({
          begin: expressDeliveryOpenBegin,
          end: expressDeliveryOpenEnd,
        });
      } else if (expressDeliverySchedule.openAllDay) {
        const expressDeliveryOpenBegin = cursorMoment
          .clone()
          .hours(0)
          .minutes(0);
        const expressDeliveryOpenEnd = expressDeliveryOpenBegin
          .clone()
          .add(1, 'day');
        expressDeliveryOpenings.push({
          begin: expressDeliveryOpenBegin,
          end: expressDeliveryOpenEnd,
        });
      }
    }
  });
  // Since our weekly schedule scan included the day before `timespanStart`, we
  // need to remove any rogue schedules from that day which do not spill over
  // into following day.

  openings = openings.filter(opening => opening.end.isAfter(timespanStart));
  // Iterate through all the schedule exceptions, applying each one to the
  // `openings` array. The possible changes when applying an exception are to
  // modify an opening's begin or end times, adding a new opening, or removing
  // an existing opening.
  scheduleExceptions.forEach(exception => {
    applyException(exception, openings, 'PICKUP'); // This is recursive.
  });
  // Create a deep copy of `openings` to be used for delivery-hour openings,
  // which are masked further by the platform hours.

  // const deliveryOpenings = openings.map(o => Object.assign({}, o));
  const deliveryOpenings = platformOpenings.filter(opening =>
    opening.end.isAfter(timespanStart)
  );

  // Iterate through all the schedule exceptions, applying each one to the
  // `openings` array. The possible changes when applying an exception are to
  // modify an opening's begin or end times, adding a new opening, or removing
  // an existing opening.
  scheduleExceptions.forEach(exception => {
    applyException(exception, deliveryOpenings, 'DELIVERY'); // This is recursive.
  });

  // Future maintainer, please forgive this naming mess
  const deliveryExpressOpenings = expressDeliveryOpenings.filter(opening =>
    opening.end.isAfter(timespanStart)
  );

  // Iterate through all the schedule exceptions, applying each one to the
  // `openings` array. The possible changes when applying an exception are to
  // modify an opening's begin or end times, adding a new opening, or removing
  // an existing opening.
  scheduleExceptions.forEach(exception => {
    applyException(exception, deliveryExpressOpenings, 'EXPRESS_DELIVERY'); // This is recursive.
  });

  // const dummyPlatformExceptions = [];

  // if (platformOpenings.length === 0) {
  //   // There are no platform openings, which means that we should create one
  //   // schedule exception signifying closure across the entire time window
  //   // under examination.
  //   const exception = {
  //     isClosed: true,
  //     startTime: timespanStart.toISOString(),
  //     endTime: timespanStart
  //       .clone()
  //       .add(numberOfDaysToScan, 'day')
  //       .hours(23)
  //       .minutes(59)
  //       .seconds(59)
  //       .toISOString(),
  //   };
  //   dummyPlatformExceptions.push(exception);
  // } else {
  //   // Use the `platformOpenings` to compute dummy "platform exceptions",
  //   // schedule exceptions where isClosed is true, for the intervals between
  //   // adjacent platform openings. Cap the beginning and ending, too, with
  //   // dummy closures so that the entire range is clearly defined.
  //   const firstOpening = platformOpenings[0].begin;
  //   const startCapException = {
  //     isClosed: true,
  //     startTime: firstOpening
  //       .clone()
  //       .subtract(1, 'day')
  //       .toISOString(),
  //     endTime: firstOpening.toISOString(),
  //   };
  //   dummyPlatformExceptions.push(startCapException);

  //   platformOpenings.forEach((platformOpening, index) => {
  //     if (index + 1 < platformOpenings.length) {
  //       const nextOpening = platformOpenings[index + 1];
  //       // Make sure there's a valid gap between the two.
  //       if (nextOpening.begin.isAfter(platformOpening.end)) {
  //         const exception = {
  //           isClosed: true,
  //           startTime: platformOpening.end.toISOString(),
  //           endTime: nextOpening.begin.toISOString(),
  //         };
  //         dummyPlatformExceptions.push(exception);
  //       }
  //     } else {
  //       const exceptionBegin = platformOpening.end;
  //       const exceptionEnd = platformOpening.end.clone().add(1, 'day');
  //       // Make sure the range is valid.
  //       if (exceptionEnd.isAfter(exceptionBegin)) {
  //         const endCapException = {
  //           isClosed: true,
  //           startTime: exceptionBegin.toISOString(),
  //           endTime: exceptionEnd.toISOString(),
  //         };
  //         dummyPlatformExceptions.push(endCapException);
  //       }
  //     }
  //   });
  // }

  // // Apply these dummy schedule exceptions to the delivery openings.
  // dummyPlatformExceptions.forEach(exception => {
  //   applyException(exception, deliveryOpenings); // This is recursive.
  // });
  // Merge overlapping and adjacent openings, sort them chronologically, and
  // transform their values into ISO 8601 strings.
  return {
    pickup: mergeSortAndStringifyOpenings(openings),
    delivery: mergeSortAndStringifyOpenings(deliveryOpenings),
    expressDelivery: mergeSortAndStringifyOpenings(deliveryExpressOpenings),
  };
};

module.exports = {
  localTimeComponents,
  computeOpenTimeRanges,
};
