module.exports = {
  'new-order-customer' : {
    en: {
      html: `<!doctype html>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <!--[if !mso]><!-->
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <!--<![endif]-->
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Order Confirmation</title>
          <!-- <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
          rel="stylesheet"> -->
          <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;700;800;900&display=swap');
      
            body {
              margin: 0;
              padding: 0;
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
            }
      
            table,
            td {
              border-collapse: collapse;
            }
      
            p {
              margin: 0;
            }
          </style>
          <style>
            @media only screen and (max-width:767px)  {
              .cofe-header table tbody tr td{padding:24px 0 !important;}
              .cofe-body-top img{width: 100px !important;}
              .cofe-body-top p{font-size: 16px !important;}
              .cofe-body-top h2{font-size: 20px !important;}
              .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
              .cofe-product-items{padding: 0 15px !important;}
              .cofe-product-title-image table tr td:first-child{padding:20px 20px !important;}
              .cofe-product-title-image table tr td:last-child{padding:20px 15px 20px 0 !important;}
              .cofe-product-total{padding: 15px 30px 15px !important;}
              .cofe-product-payment{padding: 0 15px 25px !important;}
              .cofe-footer h2{font-size: 20px !important;}
            }
          </style>
        </head>
        <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
          <div style="background-color:#f0f2f5;">
            <!--Header-->
            <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;box-sizing: border-box;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Nunito', sans-serif;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;padding:44px 0;text-align:center;">
                      <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto" width="128">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!--Header-->
            <!-- ////// Body start ///////////-->
            <!-- == Body top == -->
            <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;box-sizing: border-box;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Nunito', sans-serif;line-height: 1;">
                      <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/order-confirm.png" style="width:138px" alt="">
                      <p style="margin:30px 0 15px;">
                        <strong style="font-weight: 700;">Hi {{customerName}}</strong>
                      </p>
                      <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;">Your order has been placed</h2>
                      <p style="color:#C28D4D;margin:20px 0 25px;line-height: 24px;">Order <strong style="font-weight: 700;">#{{reference}}</strong>
                      </p>
                      <a href="#" style="font-size: 20px;font-weight: 700;background-color: #08BFB0;display: inline-block;max-width: 360px;width: 100%;color: #fff;padding: 15px 0;text-decoration: none;border-radius: 8px;">Track your order</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- == Body top == -->
            <!-- == Body products == -->
            <div class="cofe-product-items" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px;box-sizing: border-box;">
              <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 14px;">
                <thead style="background: rgba(134, 205, 215, 0.2);">
                  <tr>
                    <th style="padding: 10px 0 10px 30px;border-top-left-radius: 8px;border-bottom-left-radius: 8px;">Item</th>
                    <th style="padding: 10px 0;text-align: center;">Quantity</th>
                    <th style="padding: 10px 0;text-align: center;border-top-right-radius: 8px;border-bottom-right-radius: 8px;width: 140px">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {{products}}
                </tbody>
              </table>
            </div>
            <!-- == Body products == -->
            <!-- == Body total == -->
            <div class="cofe-product-total" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 30px 50px 30px;box-sizing: border-box;">
              <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 14px;font-weight: 700;">
                <tbody>
                  <tr>
                    <td style="width: 50%;padding: 5px 0;">Subtotal</td>
                    <td style="width: 50%;text-align: right;font-weight: 500;padding: 5px 0;">{{subTotal}}</td>
                  </tr>
                  {{discount}}
                  <tr>
                    <td style="width: 50%;padding: 5px 0;">Shipping Fees</td>
                    <td style="width: 50%;text-align: right;font-weight: 500;padding: 5px 0;">{{shipping}}</td>
                  </tr>
                  <tr>
                    <td style="width: 50%;padding: 5px 0;">Cash On Delivery Fee</td>
                    <td style="width: 50%;text-align: right;font-weight: 500;padding: 5px 0;">{{codFee}}</td>
                  </tr>
                  <tr>
                    <td style="width: 50%;font-size: 20px;font-weight: 700;padding-top: 25px;">Total</td>
                    <td style="width: 50%;text-align: right;font-size: 20px;font-weight: 700;padding-top: 25px;">{{total}}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- == Body total == -->
            <!-- == Body payment == -->
            <div class="cofe-product-payment" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px 25px;box-sizing: border-box;">
              <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 16px;border: 1px solid rgba(150, 182, 195, 0.4);">
                <tbody>
                  <tr>
                    <td style="width: 150px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                      <h3 style="font-size: 18px;font-weight: 700;margin:0;">Payment Method:</h3>
                    </td>
                    <td style="padding: 15px 20px 15px 0;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{paymentMethod}}</td>
                  </tr>
                  <tr>
                    <td style="width: 150px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                      <h3 style="font-size: 18px;font-weight: 700;margin:0;">Shipping Method:</h3>
                    </td>
                    <td style="padding: 15px 20px 15px 0;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{shippingMethod}}</td>
                  </tr>
                  <tr>
                    <td style="width: 150px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);" colspan="2">
                      <h3 style="font-size: 18px;font-weight: 700;margin:0 0 15px;">Shipping Address</h3>
                      <p>{{address}}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- == Body payment == -->
            <!-- ////// Body end ///////////-->
            <!-- ////// Footer start ///////////-->
            <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;padding:30px 0 40px;">
                      <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/footer-icon.png" style="width:48px" alt="">
                      <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;margin: 30px 0;">Thank you for Shopping with us</h2>
                      <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                      <p style="margin:10px 0 5px;font-weight: 700;">Need help?</p>
                      <p style="line-height: 22px;">For delivery billing questions, call us on <a href="tel:{{COFESupportPhone}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportPhone}}</a> or email at <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a>
                      </p>
                      <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">Stay Connected with us</h3>
                      <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                          </a>
                        </li>
                      </ul>
                      <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™ <br>
                        <strong>COFE District</strong> | Office 330, Wafra Square Building, <br> Al Reem - Abu Dhabi <br>
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- ////// Footer end ///////////-->
          </div>
        </body>
      </html>`
      },
    ar: {
      html: `<!doctype html>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
        <!--[if !mso]><!-->
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <!--<![endif]-->
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Confirmation</title>
        <!-- <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
          rel="stylesheet"> -->
        <style type="text/css">
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
          body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table,
          td {
            border-collapse: collapse;
          }
          p {
            margin: 0;
          }
        </style>
        <style>
          @media only screen and (max-width:767px)  {
            .cofe-header table tbody tr td{padding:24px 0 !important;}
            .cofe-body-top img{width: 100px !important;}
            .cofe-body-top p{font-size: 16px !important;}
            .cofe-body-top h2{font-size: 20px !important;}
            .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
            .cofe-product-items{padding: 0 15px !important;}
            .cofe-product-title-image table tr td:first-child{padding:20px 20px !important;}
            .cofe-product-title-image table tr td:last-child{padding:20px 15px 20px 0 !important;}
            .cofe-product-total{padding: 15px 30px 15px !important;}
            .cofe-product-payment{padding: 0 15px 25px !important;}
            .cofe-footer h2{font-size: 20px !important;}
          }
        </style>
      </head>
      <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
        <div style="background-color:#f0f2f5;">
          <!--Header-->
          <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td style="direction:rtl;padding:44px 0;text-align:center;">
                    <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto"
                      width="128">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!--Header-->
      
          <!-- ////// Body start ///////////-->
          <!-- == Body top == -->
          <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Tajawal', sans-serif;line-height: 1;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/order-confirm.png" style="width:138px" alt="">
                    <p style="margin:30px 0 15px;"><strong style="font-weight: 700;">مرحبًا {{customerName}}</strong></p>
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;">تم إنشاء طلبك</h2>
                    <p style="color:#C28D4D;margin:20px 0 25px;line-height: 24px;">الطلب رقم <strong style="font-weight: 700;">#{{reference}}</strong></p>
                    <a href="{{trackingLink}}"
                      style="font-size: 20px;font-weight: 700;background-color: #08BFB0;display: inline-block;max-width: 360px;width: 100%;color: #fff;padding: 15px 0 13px;text-decoration: none;border-radius: 8px;">تتبع طلبك</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body top == -->
          <!-- == Body products == -->
          <div class="cofe-product-items" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction: rtl;width:100%;text-align: left;font-family: 'Tajawal', sans-serif;font-size: 14px;">
              <thead style="background: rgba(134, 205, 215, 0.2);">
                <tr>
                  <th style="padding: 10px 30px 10px 0;border-top-right-radius: 8px;border-bottom-right-radius: 8px;text-align: right;">المنتج</th>
                  <th style="padding: 10px 0;text-align: center;">الكمية</th>
                  <th style="padding: 10px 0;text-align: center;border-top-left-radius: 8px;border-bottom-left-radius: 8px;width: 140px">السعر</th>
                </tr>
              </thead>
              <tbody>
               {{products}}
              </tbody>
            </table>
          </div>
          <!-- == Body products == -->
          <!-- == Body total == -->
          <div class="cofe-product-total" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 30px 50px 30px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction: rtl;width:100%;text-align: left;font-family: 'Tajawal', sans-serif;font-size: 14px;font-weight: 700;">
              <tbody>
                <tr>
                  <td style="width: 50%;padding: 5px 0;text-align: right;">المجموع الجزئي</td>
                  <td style="width: 50%;text-align: left;font-weight: 500;padding: 5px 0;">{{subTotal}}</td>
                </tr>
                {{discount}}
                <tr>
                  <td style="width: 50%;padding: 5px 0;text-align: right;">رسوم التوصيل</td>
                  <td style="width: 50%;text-align: left;font-weight: 500;padding: 5px 0;">{{shipping}}</td>
                </tr>
                <tr>
                  <td style="width: 50%;padding: 5px 0;text-align: right;">رسوم الدفع عند الاستلام</td>
                  <td style="width: 50%;text-align: left;font-weight: 500;padding: 5px 0;">{{codFee}}</td>
                </tr>
                <tr>
                  <td style="width: 50%;font-size: 20px;font-weight: 700;padding-top: 25px;text-align: right;">المجموع</td>
                  <td style="width: 50%;text-align: left;font-size: 20px;font-weight: 700;padding-top: 25px;">{{total}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body total == -->
          <!-- == Body payment == -->
          <div class="cofe-product-payment" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px 25px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction:rtl;width:100%;text-align: right;font-family: 'Tajawal', sans-serif;font-size: 16px;border: 1px solid rgba(150, 182, 195, 0.4);">
              <tbody>
                <tr>
                  <td style="width: 130px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0;">طريقة الدفع:</h3>
                  </td>
                  <td style="padding: 15px 0 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{paymentMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 130px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0;">طريقة التوصيل:</h3>
                  </td>
                  <td style="padding: 15px 0 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{shippingMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 130px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);" colspan="2">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0 0 15px;">عنوان التوصيل</h3>
                    <p>{{address}}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body payment == -->
          <!-- ////// Body end ///////////-->
      
          <!-- ////// Footer start ///////////-->
          <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;padding:30px 0 40px;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/footer-icon.png" style="width:48px" alt="">
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;margin: 30px 0;">شكرًا لتسوقك معنا</h2>
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                    <p style="margin:10px 0 5px;font-weight: 700;">هل تحتاج مساعدة؟</p>
                    <p style="line-height: 22px;">للأسئلة المتعلقة بالتوصيل، أو الفوترة وغيرها، اتصل على الرقم <a href="tel:94076666" style="font-weight: 700;color:inherit;text-decoration:underline;">9407 6666</a> أو أرسل بريد إلكتروني إلى <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a></p>
                    <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">ابقَ متصلًا معنا</h3>
                    <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                        </a>
                      </li>
                    </ul>
                    <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™<br>
                      <strong>COFE District</strong> | Office 330, Wafra Square Building,<br>
                      Al Reem - Abu Dhabi <br>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- ////// Footer end ///////////-->
      
        </div>
      </body>
      
      </html>`
    }
  },
  'new-order-management': {
    html: `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>New Order</title>
      <!-- <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
        rel="stylesheet"> -->
      <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;500;700;800;900&display=swap');
        body {
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        table,
        td {
          border-collapse: collapse;
        }
        p {
          margin: 0;
        }
      </style>
    </head>
    <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
      <div style="background-color:#f0f2f5;">
        <!--Header-->
        <div style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
            style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Nunito', sans-serif;">
            <tbody>
              <tr>
                <td style="direction:ltr;padding:44px 0;text-align:center;">
                  <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto"
                    width="128">
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--Header-->
    
        <!-- ////// Body start ///////////-->
        <!-- == Body top == -->
        <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;box-sizing: border-box;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
            style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;">
            <tbody>
              <tr>
                <td
                  style="direction:ltr;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Nunito', sans-serif;line-height: 1;">
                  <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/new-order.png" style="width:138px" alt="">
                  <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;margin-bottom: 0;">New order placed</h2>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- == Body top == -->
        <!-- == Body payment == -->
        <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px 25px;box-sizing: border-box;font-family: 'Nunito', sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" style="width:100%;font-family: 'Nunito', sans-serif;font-size: 14px;line-height:1;border: 1px solid rgba(150, 182, 195, 0.4);margin-bottom: 25px;">
            <tbody>
              <tr>
                <td style="width:180px;padding: 20px 15px 15px;text-align: right;">
                  <h3 style="font-weight: 700;font-size: 16px;text-transform: uppercase;margin:0;">Order details:</h3>
                </td>
                <tdstyle="padding: 8px 15px 8px 0;"></td>
              </tr>
              <tr>
                <td style="width: 180px;padding: 6px 15px;">
                  <h3 style="font-weight: 700;margin:0;text-align: right;">Order # :</h3>
                </td>
                <td style="padding: 8px 15px 8px 0;color:#08BFB0;font-weight: 700;">{{reference}}</td>
              </tr>
              <tr>
                <td style="width: 180px;padding: 6px 15px;">
                  <h3 style="font-weight: 700;margin:0;text-align: right;">Total Amount :</h3>
                </td>
                <td style="padding: 8px 15px 8px 0;">{{total}}</td>
              </tr>
              <tr>
                <td style="width: 180px;padding: 6px 15px 20px;">
                  <h3 style="font-weight: 700;margin:0;text-align: right;">Shipping Company :</h3>
                </td>
                <td style="padding: 8px 15px 20px 0;">{{shippingMethod}}</td>
              </tr>
              
            </tbody>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" style="width:100%;font-family: 'Nunito', sans-serif;font-size: 14px;line-height:1;border: 1px solid rgba(150, 182, 195, 0.4);">
            <tbody>
              <tr>
                <td style="width:180px;padding: 20px 15px 15px;text-align: right;">
                  <h3 style="font-weight: 700;font-size: 16px;text-transform: uppercase;margin:0;">Customer details:</h3>
                </td>
                <tdstyle="padding: 8px 15px 8px 0;"></td>
              </tr>
              <tr>
                <td style="width: 180px;padding: 6px 15px;">
                  <h3 style="font-weight: 700;margin:0;text-align: right;">Name :</h3>
                </td>
                <td style="padding: 8px 15px 8px 0;">{{customerName}}</td>
              </tr>
              <tr>
                <td style="width: 180px;padding: 6px 15px;">
                  <h3 style="font-weight: 700;margin:0;text-align: right;">Phone Number :</h3>
                </td>
                <td style="padding: 8px 15px 8px 0;">{{phoneNumber}}</td>
              </tr>
              <tr>
                <td style="width: 180px;padding: 6px 15px 20px;">
                  <h3 style="font-weight: 700;margin:0;text-align: right;">Address :</h3>
                </td>
                <td style="padding: 8px 15px 20px 0;">{{address}}</td>
              </tr>
              
            </tbody>
          </table>
        </div>
        <!-- == Body payment == -->
        <!-- == Body products == -->
        <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px;box-sizing: border-box;overflow: hidden;font-family: 'Nunito', sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 14px;">
            <thead style="background: rgba(134, 205, 215, 0.2);">
              <tr>
                <th style="padding: 10px 0 10px 30px;border-top-left-radius: 8px;border-bottom-left-radius: 8px;">Item</th>
                <th style="padding: 10px 0;text-align: center;">Quantity</th>
                <th style="padding: 10px 0;text-align: center;border-top-right-radius: 8px;border-bottom-right-radius: 8px;width: 140px">Price</th>
              </tr>
            </thead>
            <tbody>
              {{products}}
            </tbody>
          </table>
          <a href="{{orderLink}}"
            style="font-size: 18px;font-weight: 700;border:2px solid #08BFB0;display: block;max-width: 360px;width: 100%;color: #08BFB0;padding: 15px 0;text-decoration: none;border-radius: 8px;text-align: center;margin:30px auto 30px;">
            View Order</a>
        </div>
        <!-- == Body products == -->
        <!-- ////// Body end ///////////-->
    
        <!-- ////// Footer start ///////////-->
        <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
            style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
            <tbody>
              <tr>
                <td
                  style="direction:ltr;padding:30px 0 40px;">
                  <p style="line-height: 24px;margin: 0">© {{year}} All rights reserved - COFE App™<br>
                    <strong>COFE District</strong> | Office 330, Wafra Square Building,<br>
                    Al Reem - Abu Dhabi <br>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- ////// Footer end ///////////-->
    
      </div>
    </body>
    
    </html>`
  },
  'new-order-supplier': {
    en: {
      html: `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>New Order</title>
          <!-- <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
          rel="stylesheet"> -->
          <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;700;800;900&display=swap');
      
            body {
              margin: 0;
              padding: 0;
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
            }
      
            table,
            td {
              border-collapse: collapse;
            }
      
            p {
              margin: 0;
            }
          </style>
          <style>
            @media only screen and (max-width:767px)  {
              .cofe-header table tbody tr td{padding:24px 0 !important;}
              .cofe-body-top img{width: 100px !important;}
              .cofe-body-top p{font-size: 16px !important;}
              .cofe-body-top h2{font-size: 20px !important;}
              .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
              .cofe-product-items{padding: 0 15px !important;}
              .cofe-product-title-image table tr td:first-child{padding:20px 20px !important;}
              .cofe-product-title-image table tr td:last-child{padding:20px 15px 20px 0 !important;}
              .cofe-footer h2{font-size: 20px !important;}
            }
          </style>
        </head>
        <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
          <div style="background-color:#f0f2f5;">
            <!--Header-->
            <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Nunito', sans-serif;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;padding:44px 0;text-align:center;">
                      <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto" width="128">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!--Header-->
            <!-- ////// Body start ///////////-->
            <!-- == Body top == -->
            <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;box-sizing: border-box;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Nunito', sans-serif;line-height: 1;">
                      <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/new-order.png" style="width:138px" alt="">
                      <p style="margin:30px 0 15px;">
                        <strong style="font-weight: 700;">Hi {{supplierName}}</strong>
                      </p>
                      <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;margin-bottom: 0;">You have got a new order</h2>
                      <p style="color:#C28D4D;margin:20px 0 10px;line-height: 24px;">Order <strong style="font-weight: 700;">#{{reference}}</strong>
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- == Body top == -->
            <!-- == Body products == -->
            <div class="cofe-product-items" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px;box-sizing: border-box;overflow: hidden;font-family: 'Nunito', sans-serif;">
              <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 14px;">
                <thead style="background: rgba(134, 205, 215, 0.2);">
                  <tr>
                    <th style="padding: 10px 0 10px 30px;border-top-left-radius: 8px;border-bottom-left-radius: 8px;">Item</th>
                    <th style="padding: 10px 0;text-align: center;">Quantity</th>
                    <th style="padding: 10px 0;text-align: center;border-top-right-radius: 8px;border-bottom-right-radius: 8px;width: 140px">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {{products}}
                </tbody>
              </table>
              <a href="{{orderLink}}" style="font-size: 18px;font-weight: 700;border:2px solid #08BFB0;display: block;max-width: 360px;width: 100%;color: #08BFB0;padding: 15px 0;text-decoration: none;border-radius: 8px;text-align: center;margin:30px auto 30px;"> View Order</a>
            </div>
            <!-- == Body products == -->
            <!-- ////// Body end ///////////-->
            <!-- ////// Footer start ///////////-->
            <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
                <tbody>
                  <tr>
                    <td style="direction:ltr;padding:30px 0 40px;">
                      <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                      <p style="margin:10px 0 5px;font-weight: 700;">Need help?</p>
                      <p style="line-height: 22px;">For queries, call us on <a href="tel:{{COFESupportPhone}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportPhone}}</a> or email at <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a>
                      </p>
                      <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">Stay Connected with us</h3>
                      <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                          </a>
                        </li>
                        <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                          <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                            <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                          </a>
                        </li>
                      </ul>
                      <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™ <br>
                        <strong>COFE District</strong> | Office 330, Wafra Square Building, <br> Al Reem - Abu Dhabi <br>
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- ////// Footer end ///////////-->
          </div>
        </body>
      </html>`
    },
    ar: {
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>New Order</title>
        <!-- <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
          rel="stylesheet"> -->
        <style type="text/css">
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
          body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table,
          td {
            border-collapse: collapse;
          }
          p {
            margin: 0;
          }
        </style>
        <style>
            @media only screen and (max-width:767px)  {
              .cofe-header table tbody tr td{padding:24px 0 !important;}
              .cofe-body-top img{width: 100px !important;}
              .cofe-body-top p{font-size: 16px !important;}
              .cofe-body-top h2{font-size: 20px !important;}
              .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
              .cofe-product-items{padding: 0 15px !important;}
              .cofe-product-title-image table tr td:first-child{padding:20px 20px !important;}
              .cofe-product-title-image table tr td:last-child{padding:20px 15px 20px 0 !important;}
              .cofe-footer h2{font-size: 20px !important;}
            }
          </style>
      </head>
      <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
        <div style="background-color:#f0f2f5;">
          <!--Header-->
          <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td style="direction:rtl;padding:44px 0;text-align:center;">
                    <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto"
                      width="128">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!--Header-->
      
          <!-- ////// Body start ///////////-->
          <!-- == Body top == -->
          <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Tajawal', sans-serif;line-height: 1;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/new-order.png" style="width:138px" alt="">
                    <p style="margin:30px 0 15px;"><strong style="font-weight: 700;">مرحبًا {{supplierName}}</strong></p>
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;margin-bottom: 0;">لديك طلب جديد</h2>
                    <p style="color:#C28D4D;margin:20px 0 10px;line-height: 24px;">رقم الطلب <strong style="font-weight: 700;">#{{reference}}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body top == -->
          <!-- == Body payment == -->
          <!-- == Body products == -->
          <div class="cofe-product-items" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px;box-sizing: border-box;overflow: hidden;font-family: 'Tajawal', sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction: rtl;width:100%;text-align: left;font-family: 'Tajawal', sans-serif;font-size: 14px;">
              <thead style="background: rgba(134, 205, 215, 0.2);">
                <tr>
                  <th style="padding: 10px 30px 10px 0;border-top-right-radius: 8px;border-bottom-right-radius: 8px;text-align: right;">المنتج</th>
                  <th style="padding: 10px 0;text-align: center;">الكمية</th>
                  <th style="padding: 10px 0;text-align: center;border-top-left-radius: 8px;border-bottom-left-radius: 8px;width: 140px">السعر</th>
                </tr>
              </thead>
              <tbody>
                {{products}}
              </tbody>
            </table>
            <a href="{{orderLink}}"
                  style="font-size: 18px;font-weight: 700;border:2px solid #08BFB0;display: block;max-width: 360px;width: 100%;color: #08BFB0;padding: 15px 0;text-decoration: none;border-radius: 8px;text-align: center;margin:30px auto 30px;">
                  مشاهدة الطلب</a>
          </div>
          <!-- == Body products == -->
          <!-- ////// Body end ///////////-->
      
          <!-- ////// Footer start ///////////-->
          <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;padding:30px 0 40px;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                    <p style="margin:10px 0 5px;font-weight: 700;">هل تحتاج مساعدة؟</p>
                    <p style="line-height: 22px;"> للاستفسارات ، اتصل بنا على <a href="tel:{{COFESupportPhone}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportPhone}}</a>  أو راسلنا على  <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a></p>
                    <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">ابقَ متصلًا معنا</h3>
                    <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                        </a>
                      </li>
                    </ul>
                    <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™<br>
                      <strong>COFE District</strong> | Office 330, Wafra Square Building,<br>
                      Al Reem - Abu Dhabi <br>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- ////// Footer end ///////////-->
      
        </div>
      </body>
      
      </html>`
    }
  },
  'order-cancelled-customer': {
    en: {
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Cancellation</title>
        <!-- <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
          rel="stylesheet"> -->
        <style type="text/css">
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;700;800;900&display=swap');
          body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table,
          td {
            border-collapse: collapse;
          }
          p {
            margin: 0;
          }
        </style>
        <style>
          @media only screen and (max-width:767px)  {
            .cofe-header table tbody tr td{padding:24px 0 !important;}
            .cofe-body-top img{width: 100px !important;}
            .cofe-body-top p{font-size: 16px !important;}
            .cofe-body-top h2{font-size: 20px !important;}
            .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
            .cofe-product-payment{padding: 0 15px 25px !important;}
            .cofe-footer h2{font-size: 20px !important;}
          }
      </style>
      </head>
      <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
        <div style="background-color:#f0f2f5;">
          <!--Header-->
          <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Nunito', sans-serif;">
              <tbody>
                <tr>
                  <td style="direction:ltr;padding:44px 0;text-align:center;">
                    <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto"
                      width="128">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!--Header-->
      
          <!-- ////// Body start ///////////-->
          <!-- == Body top == -->
          <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;">
              <tbody>
                <tr>
                  <td
                    style="direction:ltr;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Nunito', sans-serif;line-height: 1;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/order-cancel.png" style="width:138px" alt="">
                    <p style="margin:30px 0 15px;"><strong style="font-weight: 700;">Hi {{customerName}}</strong></p>
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;">Your order has been<br> cancelled</h2>
                    <p style="color:#C28D4D;margin:20px 0 25px;line-height: 24px;">We are sorry, but your order <strong style="font-weight: 700;">{{reference}}</strong> has been cancelled.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body top == -->
          <!-- == Body payment == -->
          <div class="cofe-product-payment" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 50px 25px;box-sizing: border-box;font-family: 'Nunito', sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 16px;border: 1px solid rgba(150, 182, 195, 0.4);">
              <tbody>
                <tr>
                  <td style="width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-right: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: right;">Total</h3>
                  </td>
                  <td style="padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{total}}</td>
                </tr>
                <tr>
                  <td style="width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-right: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: right;">Payment Method</h3>
                  </td>
                  <td style="padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{paymentMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-right: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: right;">Delivery Method</h3>
                  </td>
                  <td style="padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{shippingMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-right: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: right;">Shipping Address</h3>
                  </td>
                  <td style="padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{address}}</td>
                </tr>
              </tbody>
            </table>
            <p style="color:#969696;font-weight:700;margin-top:30px;text-align: center;">We hope to see you soon, again!</p>
          </div>
          <!-- == Body payment == -->
          <!-- ////// Body end ///////////-->
      
          <!-- ////// Footer start ///////////-->
          <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
              <tbody>
                <tr>
                  <td
                    style="direction:ltr;padding:30px 0 40px;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/footer-icon.png" style="width:48px" alt="">
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;margin: 30px 0;">Thank you for Shopping with us</h2>
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                    <p style="margin:10px 0 5px;font-weight: 700;">Need help?</p>
                    <p style="line-height: 22px;">For delivery billing questions, call us on <a href="tel:{{COFESupportPhone}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportPhone}}</a> or email at <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a></p>
                    <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">Stay Connected with us</h3>
                    <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                        </a>
                      </li>
                    </ul>
                    <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™<br>
                      <strong>COFE District</strong> | Office 330, Wafra Square Building,<br>
                      Al Reem - Abu Dhabi <br>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- ////// Footer end ///////////-->
      
        </div>
      </body>
      
      </html>`
    },
    ar: {
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Cancellation</title>
        <style type="text/css">
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
          body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table,
          td {
            border-collapse: collapse;
          }
          p {
            margin: 0;
          }
        </style>
        <style>
          @media only screen and (max-width:767px)  {
            .cofe-header table tbody tr td{padding:24px 0 !important;}
            .cofe-body-top img{width: 100px !important;}
            .cofe-body-top p{font-size: 16px !important;}
            .cofe-body-top h2{font-size: 20px !important;}
            .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
            .cofe-product-payment{padding: 0 15px 25px !important;}
            .cofe-footer h2{font-size: 20px !important;}
          }
      </style>
      </head>
      <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
        <div style="background-color:#f0f2f5;">
          <!--Header-->
          <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td style="direction:rtl;padding:44px 0;text-align:center;">
                    <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto"
                      width="128">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!--Header-->
      
          <!-- ////// Body start ///////////-->
          <!-- == Body top == -->
          <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Tajawal', sans-serif;line-height: 1;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/order-cancel.png" style="width:138px" alt="">
                    <p style="margin:30px 0 15px;"><strong style="font-weight: 700;">مرحبًا {{customerName}}</strong></p>
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;">تم إلغاء طلبك</h2>
                    <p style="color:#C28D4D;margin:20px 0 25px;line-height: 24px;">نعتذر لإلغاء طلبك رقم <strong style="font-weight: 700;">{{reference}}</strong></p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body top == -->
          <!-- == Body payment == -->
          <div class="cofe-product-payment" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 50px 25px;box-sizing: border-box;font-family: 'Tajawal', sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction:rtl;width:100%;text-align: left;font-family: 'Tajawal', sans-serif;font-size: 16px;border: 1px solid rgba(150, 182, 195, 0.4);">
              <tbody>
                <tr>
                  <td style="direction:rtl;width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-left: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: left;">المجموع</h3>
                  </td>
                  <td style="direction:rtl;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: right;">{{total}}</td>
                </tr>
                <tr>
                  <td style="direction:rtl;width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-left: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: left;">طريقة الدفع</h3>
                  </td>
                  <td style="direction:rtl;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: right;">{{paymentMethod}}</td>
                </tr>
                <tr>
                  <td style="direction:rtl;width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-left: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: left;">طريقة التوصيل</h3>
                  </td>
                  <td style="direction:rtl;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: right;">{{shippingMethod}}</td>
                </tr>
                <tr>
                  <td style="direction:rtl;width: 160px;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);border-left: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-weight: 700;margin:0;text-align: left;">عنوان التوصيل</h3>
                  </td>
                  <td style="direction:rtl;padding: 15px 25px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);text-align: right;">{{address}}</td>
                </tr>
              </tbody>
            </table>
            <p style="color:#969696;font-weight:700;margin-top:30px;text-align: center;">نتمنى أن نراك في وقت قريب!</p>
          </div>
          <!-- == Body payment == -->
          <!-- ////// Body end ///////////-->
      
          <!-- ////// Footer start ///////////-->
          <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;padding:30px 0 40px;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/footer-icon.png" style="width:48px" alt="">
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;margin: 30px 0;">شكرًا لتسوقك معنا</h2>
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                    <p style="margin:10px 0 5px;font-weight: 700;">هل تحتاج مساعدة؟</p>
                    <p style="line-height: 22px;">للأسئلة المتعلقة بالتوصيل، أو الفوترة وغيرها، اتصل على الرقم <a href="tel:{{COFESupportPhone}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportPhone}}</a> أو أرسل بريد إلكتروني إلى <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a></p>
                    <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">ابقَ متصلًا معنا</h3>
                    <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                        </a>
                      </li>
                    </ul>
                    <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™<br>
                      <strong>COFE District</strong> | Office 330, Wafra Square Building,<br>
                      Al Reem - Abu Dhabi <br>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- ////// Footer end ///////////-->
      
        </div>
      </body>
      
      </html>`
    }
  },
  'order-delivered-customer': {
    en: {
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Delivered</title>
        <!-- <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
          rel="stylesheet"> -->
        <style type="text/css">
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;700;800;900&display=swap');
          body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table,
          td {
            border-collapse: collapse;
          }
          p {
            margin: 0;
          }
        </style>
         <style>
          @media only screen and (max-width:767px)  {
            .cofe-header table tbody tr td{padding:24px 0 !important;}
            .cofe-body-top img{width: 100px !important;}
            .cofe-body-top p{font-size: 16px !important;}
            .cofe-body-top h2{font-size: 20px !important;}
            .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
            .cofe-product-items{padding: 0 15px !important;}
            .cofe-product-title-image table tr td:first-child{padding:20px 20px !important;}
            .cofe-product-title-image table tr td:last-child{padding:20px 15px 20px 0 !important;}
            .cofe-product-total{padding: 15px 30px 15px !important;}
            .cofe-product-payment{padding: 0 15px 25px !important;}
            .cofe-footer h2{font-size: 20px !important;}
          }
        </style>
      </head>
      <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
        <div style="background-color:#f0f2f5;">
          <!--Header-->
          <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Nunito', sans-serif;">
              <tbody>
                <tr>
                  <td style="direction:ltr;padding:44px 0;text-align:center;">
                    <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto"
                      width="128">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!--Header-->
      
          <!-- ////// Body start ///////////-->
          <!-- == Body top == -->
          <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;">
              <tbody>
                <tr>
                  <td
                    style="direction:ltr;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Nunito', sans-serif;line-height: 1;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/order-delivered.png" style="width:138px" alt="">
                    <p style="margin:30px 0 15px;"><strong style="font-weight: 700;">Hi {{customerName}}</strong></p>
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;">Your order has Arrived!</h2>
                    <p style="color:#C28D4D;margin:20px 0 0;line-height: 24px;">Great news! Your order <strong style="font-weight: 700;">#{{reference}}</strong> has been delivered</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body top == -->
          <!-- == Body products == -->
          <div class="cofe-product-items" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px;box-sizing: border-box;overflow: hidden;font-family: 'Nunito', sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 14px;">
              <thead style="background: rgba(134, 205, 215, 0.2);">
                <tr>
                  <th style="padding: 10px 0 10px 30px;border-top-left-radius: 8px;border-bottom-left-radius: 8px;">Item</th>
                  <th style="padding: 10px 0;text-align: center;">Quantity</th>
                  <th style="padding: 10px 0;text-align: center;border-top-right-radius: 8px;border-bottom-right-radius: 8px;">Price</th>
                </tr>
              </thead>
              <tbody>
                {{products}}
              </tbody>
            </table>
          </div>
          <!-- == Body products == -->
          <!-- == Body total == -->
          <div class="cofe-product-total" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 30px 50px 30px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 14px;font-weight: 700;">
              <tbody>
                <tr>
                  <td style="width: 50%;padding: 5px 0;">Subtotal</td>
                  <td style="width: 50%;text-align: right;font-weight: 500;padding: 5px 0;">{{subTotal}}</td>
                </tr>
                {{discount}}
                <tr>
                  <td style="width: 50%;padding: 5px 0;">Shipping Fees</td>
                  <td style="width: 50%;text-align: right;font-weight: 500;padding: 5px 0;">{{shipping}}</td>
                </tr>
                <tr>
                  <td style="width: 50%;padding: 5px 0;">Cash On Delivery Fee</td>
                  <td style="width: 50%;text-align: right;font-weight: 500;padding: 5px 0;">{{codFee}}</td>
                </tr>
                <tr>
                  <td style="width: 50%;font-size: 20px;font-weight: 700;padding-top: 25px;">Total</td>
                  <td style="width: 50%;text-align: right;font-size: 20px;font-weight: 700;padding-top: 25px;">{{total}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body total == -->
          <!-- == Body payment == -->
          <div class="cofe-product-payment" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px 25px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="width:100%;text-align: left;font-family: 'Nunito', sans-serif;font-size: 16px;border: 1px solid rgba(150, 182, 195, 0.4);">
              <tbody>
                <tr>
                  <td style="width: 150px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0;">Payment Method:</h3>
                  </td>
                  <td style="padding: 15px 20px 15px 0;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{paymentMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 150px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0;">Shipping Method:</h3>
                  </td>
                  <td style="padding: 15px 20px 15px 0;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{shippingMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 150px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);" colspan="2">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0 0 15px;">Shipping Address</h3>
                    <p>{{address}}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body payment == -->
          <!-- == Body review == -->
          <!-- <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px 25px;box-sizing: border-box;font-family: 'Nunito', sans-serif;">
            <div style="background: rgba(134, 205, 215, 0.2);text-align: center;padding:40px;box-sizing: border-box;">
              <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
              </ul>
              <p style="margin:20px 0;font-size: 16px;">Tell us about your experience with this order</p>
              <h3 style="font-size:18px;font-weight:700;color:#08BFB0;margin:0;">Rate Your Order</h3>
            </div>
          </div> -->
          
          <!-- == Body review == -->
          
          <!-- ////// Body end ///////////-->
      
          <!-- ////// Footer start ///////////-->
          <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Nunito', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
              <tbody>
                <tr>
                  <td
                    style="direction:ltr;padding:30px 0 40px;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/footer-icon.png" style="width:48px" alt="">
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;margin: 30px 0;">Thank you for Shopping with us</h2>
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                    <p style="margin:10px 0 5px;font-weight: 700;">Need help?</p>
                    <p style="line-height: 22px;">For delivery billing questions, call us on <a href="tel:{{COFESupportPhone}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportPhone}}</a> or email at <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a></p>
                    <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">Stay Connected with us</h3>
                    <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                        </a>
                      </li>
                    </ul>
                    <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™<br>
                      <strong>COFE District</strong> | Office 330, Wafra Square Building,<br>
                      Al Reem - Abu Dhabi <br>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- ////// Footer end ///////////-->
      
        </div>
      </body>
      
      </html>`
    },
    ar: {
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Delivered</title>
        <!-- <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans&family=Nunito:wght@400;700;800;900&display=swap"
          rel="stylesheet"> -->
        <style type="text/css">
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
          body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table,
          td {
            border-collapse: collapse;
          }
          p {
            margin: 0;
          }
        </style>
         <style>
          @media only screen and (max-width:767px)  {
            .cofe-header table tbody tr td{padding:24px 0 !important;}
            .cofe-body-top img{width: 100px !important;}
            .cofe-body-top p{font-size: 16px !important;}
            .cofe-body-top h2{font-size: 20px !important;}
            .cofe-body-top a{max-width: 320px !important;font-size: 18px !important;}
            .cofe-product-items{padding: 0 15px !important;}
            .cofe-product-title-image table tr td:first-child{padding:20px 20px !important;}
            .cofe-product-title-image table tr td:last-child{padding:20px 15px 20px 0 !important;}
            .cofe-product-total{padding: 15px 30px 15px !important;}
            .cofe-product-payment{padding: 0 15px 25px !important;}
            .cofe-footer h2{font-size: 20px !important;}
          }
        </style>
      </head>
      <body style="word-spacing:normal;background-color:#f0f2f5;color:#212121">
        <div style="background-color:#f0f2f5;">
          <!--Header-->
          <div class="cofe-header" style="background:#08BFB0;background-color:#08BFB0;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#08BFB0;background-color:#08BFB0;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td style="direction:rtl;padding:44px 0;text-align:center;">
                    <img width="93" height="auto" src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/logocofe.png" style="display:block;width:93px;margin:0 auto"
                      width="128">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!--Header-->
      
          <!-- ////// Body start ///////////-->
          <!-- == Body top == -->
          <div class="cofe-body-top" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;font-size:18px;padding:50px 0 30px;text-align:center;font-family: 'Tajawal', sans-serif;line-height: 1;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/order-delivered.png" style="width:138px" alt="">
                    <p style="margin:30px 0 15px;"><strong style="font-weight: 700;">مرحبًا {{customerName}}</strong></p>
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;line-height: 32px;">طلبك وصل!</h2>
                    <p style="color:#C28D4D;margin:20px 0 0;line-height: 24px;">لدينا خبر رائع! تم توصيل طلبك رقم <strong style="font-weight: 700;">#{{reference}}</strong></p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body top == -->
          <!-- == Body products == -->
          <div class="cofe-product-items" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction: rtl;width:100%;text-align: left;font-family: 'Tajawal', sans-serif;font-size: 14px;">
              <thead style="background: rgba(134, 205, 215, 0.2);">
                <tr>
                  <th style="padding: 10px 30px 10px 0;border-top-right-radius: 8px;border-bottom-right-radius: 8px;text-align: right;">المنتج</th>
                  <th style="padding: 10px 0;text-align: center;">الكمية</th>
                  <th style="padding: 10px 0;text-align: center;border-top-left-radius: 8px;border-bottom-left-radius: 8px;">السعر</th>
                </tr>
              </thead>
              <tbody>
                {{products}}
              </tbody>
            </table>
          </div>
          <!-- == Body products == -->
          <!-- == Body total == -->
          <div class="cofe-product-total" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 30px 50px 30px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction: rtl;width:100%;text-align: left;font-family: 'Tajawal', sans-serif;font-size: 14px;font-weight: 700;">
              <tbody>
                <tr>
                  <td style="width: 50%;padding: 5px 0;text-align: right;">المجموع الجزئي</td>
                  <td style="width: 50%;text-align: left;font-weight: 500;padding: 5px 0;">{{subTotal}}</td>
                </tr>
                {{discount}}
                <tr>
                  <td style="width: 50%;padding: 5px 0;text-align: right;">رسوم التوصيل</td>
                  <td style="width: 50%;text-align: left;font-weight: 500;padding: 5px 0;">{{shipping}}</td>
                </tr>
                <tr>
                  <td style="width: 50%;padding: 5px 0;text-align: right;">رسوم الدفع عند الاستلام</td>
                  <td style="width: 50%;text-align: left;font-weight: 500;padding: 5px 0;">{{codFee}}</td>
                </tr>
                <tr>
                  <td style="width: 50%;font-size: 20px;font-weight: 700;padding-top: 25px;text-align: right;">المجموع</td>
                  <td style="width: 50%;text-align: left;font-size: 20px;font-weight: 700;padding-top: 25px;">{{total}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body total == -->
          <!-- == Body payment == -->
          <div class="cofe-product-payment" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px 25px;box-sizing: border-box;">
            <table border="0" cellpadding="0" cellspacing="0" style="direction:rtl;width:100%;text-align: right;font-family: 'Tajawal', sans-serif;font-size: 16px;border: 1px solid rgba(150, 182, 195, 0.4);">
              <tbody>
                <tr>
                  <td style="width: 130px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0;">طريقة الدفع:</h3>
                  </td>
                  <td style="padding: 15px 0 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{paymentMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 130px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0;">طريقة التوصيل:</h3>
                  </td>
                  <td style="padding: 15px 0 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);">{{shippingMethod}}</td>
                </tr>
                <tr>
                  <td style="width: 130px;padding: 15px 15px 15px 20px;border-bottom: 1px solid rgba(150, 182, 195, 0.4);" colspan="2">
                    <h3 style="font-size: 18px;font-weight: 700;margin:0 0 15px;">عنوان التوصيل</h3>
                    <p>{{address}}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- == Body payment == -->
          <!-- == Body review == -->
          <!-- <div style="direction:rtl;background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding: 0 30px 25px;box-sizing: border-box;font-family: 'Tajawal', sans-serif;">
            <div style="background: rgba(134, 205, 215, 0.2);text-align: center;padding:40px;box-sizing: border-box;">
              <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
                <li style="display: inline-block;vertical-align: middle;margin: 0 12px;"><img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/rating.png" alt="" style="width: 42px;"></li>
              </ul>
              <p style="margin:20px 0;font-size: 16px;">أخبرنا عن تجربتك لهذا الطلب</p>
              <h3 style="font-size:18px;font-weight:700;color:#08BFB0;margin:0;">قيّم طلبك</h3>
            </div>
          </div> -->
          
          <!-- == Body review == -->
          
          <!-- ////// Body end ///////////-->
      
          <!-- ////// Footer start ///////////-->
          <div class="cofe-footer" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:640px;padding:0 30px;box-sizing: border-box;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#ffffff;background-color:#ffffff;width:100%;font-family: 'Tajawal', sans-serif;border-top: 2px dashed #08BFB0;font-size: 16px;text-align:center;">
              <tbody>
                <tr>
                  <td
                    style="direction:rtl;padding:30px 0 40px;">
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/footer-icon.png" style="width:48px" alt="">
                    <h2 style="font-size: 24px;font-weight: 900;text-transform: uppercase;margin: 30px 0;">شكرًا لتسوقك معنا</h2>
                    <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/support.png" style="width:24px" alt="">
                    <p style="margin:10px 0 5px;font-weight: 700;">هل تحتاج مساعدة؟</p>
                    <p style="line-height: 22px;">للأسئلة المتعلقة بالتوصيل، أو الفوترة وغيرها، اتصل على الرقم <a href="tel:{{COFESupportPhone}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportPhone}}</a> أو أرسل بريد إلكتروني إلى <a href="mailto:{{COFESupportEmail}}" style="font-weight: 700;color:inherit;text-decoration:underline;">{{COFESupportEmail}}</a></p>
                    <h3 style="font-size: 18px;font-weight: 700;margin:25px 0 20px">ابقَ متصلًا معنا</h3>
                    <ul style="padding: 0;margin: 0;list-style: none;font-size: 0;">
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://twitter.com/getCOFE" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/twitter.png" alt="" style="width: 26.66px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.facebook.com/getcofe" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/facebook.png" alt="" style="width: 11px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.instagram.com/getcofe/" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/instagram.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.linkedin.com/check/add-phone?country_code=pk" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/linkedin.png" alt="" style="width: 21.33px;display: block;">
                        </a>
                      </li>
                      <li style="display: inline-block;vertical-align: middle;margin: 0 15px;">
                        <a href="https://www.youtube.com/channel/UCpPigW9Rim-J6DlZVJUNq_Q" target="_blank" style="display: block;">
                          <img src="https://ecom-dev-bucket.s3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png3.eu-west-1.amazonaws.com/ecom/development/emails/youtube.png" alt="" style="width: 30.33px;display: block;">
                        </a>
                      </li>
                    </ul>
                    <p style="line-height: 24px;margin-top: 30px">© {{year}} All rights reserved - COFE App™<br>
                      <strong>COFE District</strong> | Office 330, Wafra Square Building,<br>
                      Al Reem - Abu Dhabi <br>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- ////// Footer end ///////////-->
      
        </div>
      </body>
      
      </html>`
    }
  },
  'discount-row': {
    en: {
      html: `<tr>
          <td style="width: 50%;color: #08BFB0;font-weight: 800;padding: 5px 0;">Coupon applied</td>
          <td style="width: 50%;text-align: right;color: #08BFB0;font-weight: 700;padding: 5px 0;"> {{discountAmount}} </td>
      </tr>`
    },
    ar: {
      html: `<tr>
          <td style="width: 50%;color: #08BFB0;font-weight: 800;padding: 5px 0;text-align: right;">تم تطبيق كود الخصم</td>
          <td style="width: 50%;text-align: left;color: #08BFB0;font-weight: 700;padding: 5px 0;"> {{discountAmount}} </td>
      </tr>`
    }
  }
}
