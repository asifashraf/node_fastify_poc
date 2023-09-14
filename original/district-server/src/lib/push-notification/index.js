const { generateOneSignalPushNotificationPayload } = require('./onesignal');
const { generateFCMPushNotificationPayload, generateFCMPushNotificationPayloadOnlyData } = require('./firebase-cloud-messaging');
const { notificationProviders } = require('../../notifications/enums');

function contentTemplatePlaceholders() {
  return [
    'brand_name_en',
    'brand_name_ar',
    'brand_name_tr',
    'sender_name',
    'amount',
    'currencyCode',
    'currencyCodeAr',
    'receiverName',
    'productNames',
    'productNamesAr',
    'orderId',
    'brandName',
    'brandNameAr',
    'brandNameTr',
    'first_name',
    'planName',
    'planNameAr',
    'planNameTr',
    'date',
    'remainingDay',
    'branchName',
    'branchNameAr',
    'branchNameTr',
    'branchId'
  ];
}

function replacePlaceholders(message, data) {
  for (const [key, value] of Object.entries(message)) {
    message[key] = contentTemplatePlaceholders().reduce(
      (formattedValue, placeholder) => {
        const placeholderText = data[placeholder] ?? '';
        return formattedValue.split(`{{${placeholder}}}`).join(placeholderText);
      },
      value
    );
  }
  return message;
}

function contentTemplates() {
  return {
    headings: {
      orderAccepted: {
        en:
          'Hey! Your COFE is being brewed. 😀',
        ar: 'أهلًا! يتم الآن تجهيز طلبك!',
        tr:
          'Hey! COFE siparişin hazırlanıyor. 😀',
      },
      orderRejected: {
        en: 'Oops! 😔',
        ar: 'عذرًا ! 😔',
        tr: 'Oops! 😔',
      },
      orderReadyForPickup: {
        en: 'Your COFE is good to go! ☕️',
        ar: 'يمكنك استلام طلبك الآن! ☕️',
        tr: 'COFE siparişin sıcacık hazır! ☕️',
      },
      orderOutOfDelivery: {
        en: 'Your COFE is on its way! 🛵',
        ar: 'طلبك في طريقه إليك! 🛵',
        tr: 'COFE siparişin yolda! 🛵',
      },
      giftCardOrderCreate: {
        en: 'You Received a Gift Card!',
        ar: 'وصلت لك هدية!',
        tr: 'COFE Hediye Kartı hesabına yüklendi!',
      },
      referralActivated: {
        en: 'You’ve Received {{amount}} {{currencyCode}} COFE Credit',
        ar: 'استلمت {{amount}} {{currencyCodeAr}} في رصيد كوفي',
        tr: '{{amount}} {{currencyCode}} COFE Kredisi Hesabına Yüklendi',
      },
      storeOrderDispatched: {
        en: 'Dispatched',
        ar: 'Dispatched',
        tr: 'Yola Çıktı',
      },
      storeOrderDelivered: {
        en: 'Delivered',
        ar: 'Delivered',
        tr: 'Teslim Edildi',
      },
      storeOrderRejected: {
        en: 'Rejected',
        ar: 'Rejected',
        tr: 'Reddedildi',
      },
      orderCustomerArrival: {
        en: 'Are you here?',
        ar: 'هل انت هنا؟',
        tr: 'Burada mısın?',
      },
      subscriptionLowCupCountsReminder: {
        en: 'Your coffee supply is running low!',
        ar: {
          AE: 'مخزون قهوتك قرّب يخلص؟!',
          KW: 'مخزون قهوتك قرّب يخلص؟!',
          SA: 'مخزون قهوتك قرّب يخلص؟!',
        },
        tr: 'Your coffee supply is running low!',
      },
      subscriptionAllCupsConsumedFastReminder: {
        en: 'You\'ve consumed all cups!',
        ar: {
          AE: 'مسسررع!',
          KW: 'مسسررع!',
          SA: 'مسسررع!',
        },
        tr: 'You\'ve consumed all cups!',
      },
      subscriptionAllCupsConsumedReminder: {
        en: 'No more cups left? 🤔',
        ar: {
          AE: 'افاا، خلّصت اكوابك؟',
          KW: 'افاا، خلّصت اكوابك؟',
          SA: 'افاا، خلّصت اكوابك؟',
        },
        tr: 'No more cups left? 🤔',
      },
      subscriptionExpiryDateNearReminderNotification: {
        en: 'Your subscription expires on {{date}}.',
        ar: {
          AE: '{{date}} ينتهي اشتراكك في',
          KW: 'ينتهي اشتراكك في {{date}}',
          SA: 'ينتهي اشتراكك في {{date}}',
        },
        tr: 'Your subscription expires on {{date}}.',
      },
      subscriptionExpiredTodayReminder: {
        en: 'Renew your subscription 🚨',
        ar: {
          AE: 'جدد اشتراكك🚨',
          KW: 'جدد اشتراكك🚨',
          SA: 'جدد اشتراكك🚨',
        },
        tr: 'Renew your subscription 🚨',
      },
      subscriptionExpired3DaysLaterReminder: {
        en: 'Time to subscribe again! 🔄',
        ar: {
          AE: 'لا تفوّتها !😱',
          KW: 'لا تفوّتها !😱',
          SA: 'لا تفوّتها !😱',
        },
        tr: 'Time to subscribe again! 🔄',
      },
      subscriptionExpired7DaysLaterReminder: {
        en: 'Get more for less! 🤩',
        ar: {
          AE: 'ادفع أقل مع كوفي 😍',
          KW: 'ادفع أقل مع كوفي 😍',
          SA: 'ادفع أقل مع كوفي 😍',
        },
        tr: 'Get more for less! 🤩',
      },
      subscriptionExpired15DaysLaterReminder: {
        en: 'Don\'t miss out! 🤗',
        ar: {
          AE: 'لا تفوّتها !😱',
          KW: 'لايطوفك !😱',
          SA: 'لا تفوّتها !😱',
        },
        tr: 'Don\'t miss out! 🤗',
      },
      subscriptionExpired30DaysLaterReminder: {
        en: 'Not too late for extra 5!',
        ar: {
          AE: 'أكواب علينا 😍 5',
          KW: 'أكواب علينا 😍 5',
          SA: 'أكواب علينا 😍 5',
        },
        tr: 'Not too late for extra 5!',
      },
      subscriptionFinishReminder: {
        en: 'You have {{remainingDay}} days of caffeination left!',
        ar: 'تبقت لديك {{remainingDay}} أيام من الكافيين!',
        tr: '{{remainingDay}} günlük kafeininiz kaldı!',
      },
      subscriptionPurchase: {
        en: 'Congrats!',
        ar: 'مبروك!',
        tr: 'Tebrikler!',
      },
      subscriptionAutoRenewalReminder: {
        en: 'Your subscription will be renewed!',
        ar: 'سيتم تجديد اشتراكك!',
        tr: 'Aboneliğiniz yenilenecek!',
      },
      subscriptionAutoRenewalPurchaseSuccess: {
        en: 'Subscription successfully renewed!',
        ar: 'تم التجديد بنجاح!',
        tr: 'Başarıyla yenilendi!',
      },
      subscriptionAutoRenewalPurchaseFailure: {
        en: 'Subscription plan expired!',
        ar: 'انتهت صلاحية الاشتراك!',
        tr: 'Abonelik planının süresi doldu!',
      },
      brandLocationOpenedNotification: {
        en: 'Hello from {{brandName}} - {{branchName}}!',
        ar: '! {{branchName}} - {{brandName}} مرحبا من',
        tr: 'Hello from {{brandName}} - {{branchName}}!',
      },
      abandonedCartReminder: {
        en: 'Your cart is waiting for you!',
        ar: 'عربة التسوق الخاصة بك تنتظرك!',
        tr: 'Sepetiniz sizi bekliyor!',
      },
    },
    contents: {
      orderAccepted: {
        en: '{{brand_name_en}} has accepted your order.',
        ar: 'تم قبول طلبك من {{brand_name_ar}}.😀',
        tr: '{{brand_name_en}} siparişinizi kabul etti.',
      },
      orderRejected: {
        en: 'Looks like {{brand_name_en}} was unable to accept your order.',
        ar: 'تم إلغاء طلبك!',
        tr: 'Görünüşe göre {{brand_name_en}} siparişinizi kabul edemedi.',
      },
      orderReadyForPickup: {
        en: 'Your order is ready for pickup.',
        ar: 'طلبك جاهز!',
        tr: 'Siparişin teslim alman için hazır.',
      },
      orderOutOfDelivery: {
        en: 'Your order will be with you soon.',
        ar: 'يمكنك الاستمتاع في طلبك قريبًا!',
        tr: 'Siparişin yakında seninle olacak.',
      },
      giftCardOrderCreate: {
        en:
          '{{sender_name}} has sent you a gift card. Redeem it now within the app.',
        ar:
          '{{sender_name}} أرسل لك بطاقة هدية، يمكنك استخدامها الآن في التطبيق.',
        tr:
          '{{sender_name}} sana bir COFE Hediye Kartı gönderdi. Şimdi kullan!',
      },
      referralActivated: {
        en: 'Your friend {{receiverName}} placed their first order!',
        ar: 'صديقك {{receiverName}} قام بأول طلب!',
        tr: 'Arkadaşın {{receiverName}} ilk siparişini verdi!',
      },
      storeOrderDispatched: {
        en: 'Your Order {{orderId}} from {{brandName}} has been dispatched',
        ar: 'طلبك {{orderId}} من {{brandName}} في طريقه لك!',
        tr: '{{brandName}} {{orderId}} kodlu siparişin yola çıktı!',
      },
      storeOrderDelivered: {
        en: 'Your Order {{orderId}} from {{brandName}} has been delivered',
        ar: 'طلبك {{orderId}} من {{brandName}} تم توصيله.',
        tr: '{{brandName}} {{orderId}} kodlu siparişin teslim edildi!',
      },
      storeOrderRejected: {
        en: 'Your Order {{orderId}} from {{brandName}} has been rejected',
        ar: 'Your Order {{orderId}} from {{brandNameAr}} has been rejected',
        tr: '{{brandName}} {{orderId}} kodlu siparişin reddedildi!',
      },
      orderCustomerArrival: {
        en: 'Let the Barista know if you have arrived.',
        ar: 'دع الباريستا يعرف إذ كنت قد وصلت.',
        tr: 'Baristanın gelip gelmediğini bilmesini sağla.',
      },
      subscriptionLowCupCountsReminder: {
        en: 'Enjoy all the cups and subscribe for up to 5 cups on us again 😍',
        ar: {
          AE: 'عبّي أكوابك وجدد اشتراكك مع كوفي ، وخلي ٥ أكواب علينا مرة ثانية😍',
          KW: 'عبّي أكوابك وجدد اشتراكك مع كوفي ، وخلي ٥ أكواب علينا مرة ثانية😍',
          SA: 'عبّي أكوابك وجدد اشتراكك مع كوفي ، وخلي ٥ أكواب علينا مرة ثانية😍',
        },
        tr: 'Enjoy all the cups and subscribe for up to 5 cups on us again 😍',
      },
      subscriptionAllCupsConsumedFastReminder: {
        en: 'That was fast! Re-subscribe and enjoy up to 5 cups on us again 😍',
        ar: {
          AE: 'خلصت كل أكوابك. جدد اشتراكك مع كوفي ولك ٥ أكواب علينا مره ثانية',
          KW: 'خلصت كل أكوابك. جدد اشتراكك مع كوفي ولك ٥ أكواب علينا مره ثانية',
          SA: 'خلصت كل أكوابك. جدد اشتراكك مع كوفي ولك ٥ أكواب علينا مره ثانية',
        },
        tr: 'That was fast! Re-subscribe and enjoy up to 5 cups on us again 😍',
      },
      subscriptionAllCupsConsumedReminder: {
        en: 'Renew your COFE subscription to enjoy up to 5 cups on us again! 😍',
        ar: {
          AE: 'جدد اشتراكك مع كوفي و استمتع  بـ ٥ أكواب علينا مرة ثانية! 😍',
          KW: 'جدد اشتراكك مع كوفي و استمتع  بـ ٥ أكواب علينا مرة ثانية! 😍',
          SA: 'جدد اشتراكك مع كوفي و استمتع  بـ ٥ أكواب علينا مرة ثانية! 😍',
        },
        tr: 'Renew your COFE subscription to enjoy up to 5 cups on us again! 😍',
      },
      subscriptionExpiryDateNearReminderNotification: {
        en: 'So here\'s a reminder to renew it and have 5 cups on us again! 😉',
        ar: {
          AE: 'جدد اشتراكك مع كوفي ، و لك ٥ اكواب علينا مرة ثانية😍',
          KW: 'جدد اشتراكك مع كوفي ، و لك ٥ اكواب علينا مرة ثانية😍',
          SA: 'جدد اشتراكك مع كوفي ، و لك ٥ اكواب علينا مرة ثانية😍',
        },
        tr: 'So here\'s a reminder to renew it and have 5 cups on us again! 😉',
      },
      subscriptionExpiredTodayReminder: {
        en: 'We hope you enjoyed your subscription! Renew now and get up to 5 cups on us again 👉',
        ar: {
          AE: 'نتمنى انك استمتعت باشتراكك معنا💚 جدد اشتراكك  وخلي ٥ أكواب علينا مرة ثانية😍',
          KW: 'نتمنى انك استمتعت باشتراكك معنا💚 جدد اشتراكك  وخلي ٥ أكواب علينا مرة ثانية😍',
          SA: 'نتمنى انك استمتعت باشتراكك معنا💚 جدد اشتراكك  وخلي ٥ أكواب علينا مرة ثانية😍',
        },
        tr: 'We hope you enjoyed your subscription! Renew now and get up to 5 cups on us again 👉',
      },
      subscriptionExpired3DaysLaterReminder: {
        en: 'Tap here and reactivate your subscription benefits with up to 5 extra cups on us!',
        ar: {
          AE: 'اشترك معنا ٣٠ يوم مرة ثانية 💚 و لك ٥ اكواب علينا 😍',
          KW: 'اشترك معنا ٣٠ يوم مرة ثانية 💚 و لك ٥ أكواب علينا 😍',
          SA: 'اشترك معنا ٣٠ يوم مرة ثانية 💚 و لك ٥ اكواب علينا 😍',
        },
        tr: 'Tap here and reactivate your subscription benefits with up to 5 extra cups on us!',
      },
      subscriptionExpired7DaysLaterReminder: {
        en: 'Resubscribe today and have up to 5 cups on us again!',
        ar: {
          AE: ' اشترك معنا اليوم 💚 و لك ٥ أكواب علينا 😍',
          KW: ' اشترك معنا اليوم 💚 و لك ٥ أكواب علينا 😍',
          SA: ' اشترك معنا اليوم 💚 و لك ٥ أكواب علينا 😍',
        },
        tr: 'Resubscribe today and have up to 5 cups on us again!',
      },
      subscriptionExpired15DaysLaterReminder: {
        en: 'Resubscribe to our 30 days plan, and have another 5 cups on us again 👉',
        ar: {
          AE: ' اشترك معنا ٣٠ يوم مرة ثانية 💚 و لك ٥ اكواب علينا 😍',
          KW: 'جدد اشتراكك مع كوفي ، و لك ٥ أكواب علينا مرة ثانية😍',
          SA: ' اشترك معنا ٣٠ يوم مرة ثانية 💚 و لك ٥ اكواب علينا 😍',
        },
        tr: 'Resubscribe to our 30 days plan, and have another 5 cups on us again 👉',
      },
      subscriptionExpired30DaysLaterReminder: {
        en: 'Subscribe again and have up to 5 cups on us! 🤩',
        ar: {
          AE: 'كل اللي عليك جدد اشتراكك مع كوفي ، و لك ٥ اكواب علينا مرة ثانية😍',
          KW: 'كل ما عليك جدد اشتراكك مع كوفي ، و لك ٥ اكواب علينا مرة ثانية😍',
          SA: 'كل اللي عليك جدد اشتراكك مع كوفي ، و لك ٥ اكواب علينا مرة ثانية😍',
        },
        tr: 'Subscribe again and have up to 5 cups on us! 🤩',
      },
      subscriptionFinishReminder: {
        en: 'Your {{planName}} subscription plan from {{brandName}} will expire on {{date}}',
        ar: 'سينتهي اشتراكك {{planNameAr}} من {{brandNameAr}} في يوم {{date}}',
        tr: '{{brandNameTr}}\'den {{planNameTr}} abonelik planınızın süresi {{date}} tarihinde dolacak',
      },
      subscriptionPurchase: {
        en: 'The payment is processed successfully. Enjoy your {{planName}} subscription from {{brandName}}.',
        ar: 'تمت معالجة الدفع بنجاح. استمتع باشتراك الـ {{planNameAr}} من {{brandNameAr}}.',
        tr: 'Ödeme başarıyla alındı {{brandNameTr}}\'den {{planNameTr}} aboneliğinizin keyfini çıkarın.',
      },
      subscriptionAutoRenewalReminder: {
        en: 'Your {{planName}} subscription plan from {{brandName}} will be renewed today.',
        ar: 'سيتم تجديد اشتراك {{planNameAr}} الخاص بك من {{brandNameAr}} اليوم.',
        tr: '{{brandNameTr}}\'den {{planNameTr}} abonelik planınız bugün yenilenecek.',
      },
      subscriptionAutoRenewalPurchaseSuccess: {
        en: 'Your subscription plan {{planName}} from {{brandName}} has been successfully renewed. Enjoy your daily dose of COFE.',
        ar: 'تم تجديد اشتراكك {{planNameAr}} من {{brandNameAr}} بنجاح. استمتع بجرعة القهوة يومًا مع كوفي.',
        tr: '{{brandNameTr}}\'den aktif abonelik planınız {{planNameTr}} başarıyla yenilendi. Günlük COFE dozunuzun tadını çıkarın.',
      },
      subscriptionAutoRenewalPurchaseFailure: {
        en: 'We were unable to renew your {{planName}} subscription plan from {{brandName}} due to a failed payment.',
        ar: 'أوبس! لم نتمكن من تجديد اشتراكك {{planNameAr}} من {{brandNameAr}} بسبب فشل عملية الدفع.',
        tr: 'Hay aksi! Başarısız bir ödeme nedeniyle {{brandNameTr}}\'den {{planNameTr}} abonelik planınızı yeniden yenileyemedik.',
      },
      brandLocationOpenedNotification: {
        en: 'We are now ready to serve you. 😀',
        ar: 'نحن الآن جاهزون لخدمتك. :)',
        tr: 'We are now ready to serve you. 😀',
      },
      abandonedCartReminder: {
        en: 'Your cart is waiting for you content!',
        ar: 'عربة التسوق الخاصة بك تنتظرك!',
        tr: 'Sepetiniz sizi bekliyor content!',
      },
      brandLocationOpenedNotificationDeeplink: 'cofeapp://cofeapp.com/home/branch?id={{branchId}}',
    },
    urls: {
      orderAccepted: null,
      orderRejected: null,
      orderReadyForPickup: null,
      orderOutOfDelivery: null,
      giftCardOrderCreate: null,
      referralActivated: null,
      storeOrderDispatched: null,
      storeOrderDelivered: null,
      storeOrderRejected: null,
      orderCustomerArrival: null,
    },
    dataTemplates: {
      subDescription: {
        orderCustomerArrival: {
          en: 'Let the barista know you are in the store',
          ar: 'أخبر الباريستا بأنك في المقهى.',
          tr: 'Baristanın mağazada olduğunu bilmesini sağla.',
        },
      }
    }
  };
}

async function generatePushNotificationPayload(
  provider, settings, context, data
) {
  if (provider === notificationProviders.FIREBASE_CLOUD_MESSAGING) {
    return generateFCMPushNotificationPayload(settings, context, data);
  }
  if (provider === notificationProviders.ONE_SIGNAL) {
    return generateOneSignalPushNotificationPayload(data);
  }
  return null;
}

async function generatePushNotificationPayloadWithOnlyData(
  provider, settings, context, data
) {
  if (provider === notificationProviders.FIREBASE_CLOUD_MESSAGING) {
    return generateFCMPushNotificationPayloadOnlyData(settings, context, data);
  }
  return null;
}

module.exports = {
  generatePushNotificationPayload,
  contentTemplatePlaceholders,
  replacePlaceholders,
  contentTemplates,
  generatePushNotificationPayloadWithOnlyData,
};
