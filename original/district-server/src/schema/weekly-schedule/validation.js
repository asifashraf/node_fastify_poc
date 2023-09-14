const { forEach } = require('lodash');
const { localTimeComponents } = require('../../lib/schedules');
const { weeklyScheduleError } = require('../root/enums');

const validateTimeInIsolation = (time, type) => {
  const errors = [];
  if (!time) {
    switch (type) {
      case 'OPEN_TIME':
        errors.push(weeklyScheduleError.MISSING_OPEN_TIME);
        break;
      case 'DELIVERY_OPEN_TIME':
        errors.push(weeklyScheduleError.MISSING_DELIVERY_OPEN_TIME);
        break;
      case 'EXPRESS_DELIVERY_OPEN_TIME':
        errors.push(weeklyScheduleError.MISSING_EXPRESS_DELIVERY_OPEN_TIME);
        break;
      default:
        break;
    }

    return { errors };
  }
  const { hours, minutes } = localTimeComponents(time);
  if (
    hours === null ||
    minutes === null ||
    isNaN(hours) ||
    isNaN(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    switch (type) {
      case 'OPEN_TIME':
        errors.push(weeklyScheduleError.INVALID_OPEN_TIME_FORMAT);
        break;
      case 'DELIVERY_OPEN_TIME':
        errors.push(weeklyScheduleError.INVALID_DELIVERY_OPEN_TIME_FORMAT);
        break;
      case 'EXPRESS_DELIVERY_OPEN_TIME':
        errors.push(
          weeklyScheduleError.INVALID_EXPRESS_DELIVERY_OPEN_TIME_FORMAT
        );
        break;
      default:
        break;
    }
  }
  return { hours, minutes, errors };
};

const validateOpenDurationInIsolation = (openDuration, type) => {
  const errors = [];
  if (!openDuration) {
    switch (type) {
      case 'OPEN_DURATION':
        errors.push(weeklyScheduleError.MISSING_OPEN_DURATION);
        break;
      case 'DELIVERY_OPEN_DURATION':
        errors.push(weeklyScheduleError.MISSING_DELIVERY_OPEN_DURATION);
        break;
      case 'EXPRESS_DELIVERY_OPEN_DURATION':
        errors.push(weeklyScheduleError.MISSING_EXPRESS_DELIVERY_OPEN_DURATION);
        break;
      default:
        break;
    }
  }
  return { errors };
};

const validationArtifactsForSchedule = schedule => {
  if (schedule.openAllDay) {
    return {
      isValidInIsolation: true,
      isAllDay: true,
      day: schedule.day,
      effectiveOpenTime: '00:00',
      effectiveOpenDuration: 24 * 60 - 1,
      effectiveOpenTimeHours: 0,
      effectiveOpenTimeMinutes: 0,
      effectiveOpenTimeMinutesFromMidnight: 0,
      effectiveCloseTimeMinutesFromMidnight: 24 * 60 - 1,
      validationErrors: [],
    };
  } else if (
    !schedule.openTime ||
    !schedule.openDuration ||
    !schedule.deliveryOpenTime ||
    !schedule.deliveryOpenDuration ||
    !schedule.expressDeliveryOpenTime ||
    !schedule.expressDeliveryOpenDuration
  ) {
    return {
      isValidInIsolation: true,
      isAllDay: false,
      day: schedule.day,
      validationErrors: [],
    };
  }
  const {
    hours: openTimeHours,
    minutes: openTimeMinutes,
    errors: openTimeErrors,
  } = validateTimeInIsolation(schedule.openTime, 'OPEN_TIME');

  const {
    hours: deliveryOpenTimeHours,
    minutes: deliveryOpenTimeMinutes,
    errors: deliveryOpenTimeErrors,
  } = validateTimeInIsolation(schedule.deliveryOpenTime, 'DELIVERY_OPEN_TIME');

  const {
    hours: expressDeliveryOpenTimeHours,
    minutes: expressDeliveryOpenTimeMinutes,
    errors: expressDeliveryOpenTimeErrors,
  } = validateTimeInIsolation(
    schedule.deliveryOpenTime,
    'EXPRESS_DELIVERY_OPEN_TIME'
  );

  const timeErrors = openTimeErrors
    .concat(deliveryOpenTimeErrors)
    .concat(expressDeliveryOpenTimeErrors);

  const { errors: openDurationErrors } = validateOpenDurationInIsolation(
    schedule.openDuration,
    'OPEN_DURATION'
  );
  const {
    errors: deliveryOpenDurationErrors,
  } = validateOpenDurationInIsolation(
    schedule.deliveryOpenDuration,
    'DELIVERY_OPEN_DURATION'
  );
  const {
    errors: expressDeliveryOpenDurationErrors,
  } = validateOpenDurationInIsolation(
    schedule.deliveryOpenDuration,
    'EXPRESS_DELIVERY_OPEN_DURATION'
  );
  const durationErrors = openDurationErrors
    .concat(deliveryOpenDurationErrors)
    .concat(expressDeliveryOpenDurationErrors);

  if (timeErrors.length > 0 || durationErrors.length > 0) {
    return {
      isValidInIsolation: false,
      isAllDay: false,
      day: schedule.day,
      validationErrors: timeErrors.concat(durationErrors),
    };
  }
  return {
    isValidInIsolation: true,
    isAllDay: false,
    day: schedule.day,
    effectiveOpenTime: schedule.openTime,
    effectiveOpenDuration: schedule.openDuration,
    effectiveOpenTimeHours: openTimeHours,
    effectiveOpenTimeMinutes: openTimeMinutes,
    effectiveOpenTimeMinutesFromMidnight: openTimeHours * 60 + openTimeMinutes,
    effectiveCloseTimeMinutesFromMidnight:
      openTimeHours * 60 + openTimeMinutes + schedule.openDuration,
    // delivery
    effectiveDeliveryOpenTimeMinutesFromMidnight:
      deliveryOpenTimeHours * 60 + deliveryOpenTimeMinutes,
    effectiveDeliveryCloseTimeMinutesFromMidnight:
      deliveryOpenTimeHours * 60 +
      deliveryOpenTimeMinutes +
      schedule.deliveryOpenDuration,
    effectiveExpressDeliveryOpenTimeMinutesFromMidnight:
      expressDeliveryOpenTimeHours * 60 + expressDeliveryOpenTimeMinutes,
    effectiveExpressDeliveryCloseTimeMinutesFromMidnight:
      expressDeliveryOpenTimeHours * 60 +
      expressDeliveryOpenTimeMinutes +
      schedule.expressDeliveryOpenDuration,
    validationErrors: timeErrors.concat(durationErrors),
  };
};

const scheduleArtifactsOverlap = (artifacts, other) => {
  const nextDay = artifacts.day + 1 <= 7 ? artifacts.day + 1 : 1;
  if (other.day === nextDay) {
    const otherOpening = other.effectiveOpenTimeMinutesFromMidnight + 24 * 60;
    const otherDeliveryOpening =
      other.effectiveDeliveryOpenTimeMinutesFromMidnight + 24 * 60;
    const otherExpressDeliveryOpening =
      other.effectiveExpressDeliveryOpenTimeMinutesFromMidnight + 24 * 60;
    return (
      artifacts.effectiveCloseTimeMinutesFromMidnight > otherOpening ||
      artifacts.effectiveDeliveryCloseTimeMinutesFromMidnight >
        otherDeliveryOpening ||
      artifacts.effectiveExpressDeliveryCloseTimeMinutesFromMidnight >
        otherExpressDeliveryOpening
    );
  }
  return false;
};

const validateScheduleList = scheduleList => {
  const errors = [];
  const artifacts = scheduleList.map(validationArtifactsForSchedule);
  forEach(artifacts, a => {
    forEach(a.validationErrors, e => errors.push(e));
  });
  // If any artifacts failed in-isolation validation, bail out now.
  if (errors.length > 0) {
    return errors;
  }
  // Now check for overlapping schedules.
  forEach(artifacts, a => {
    forEach(artifacts, other => {
      if (scheduleArtifactsOverlap(a, other)) {
        errors.push(weeklyScheduleError.OVERLAPPING_SCHEDULES);
      }
    });
  });
  return errors;
};

module.exports = {
  weeklyScheduleError,
  validateScheduleList,
};
