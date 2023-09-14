module.exports = function InitializationMediator(opts) {

    const { nodeCron, mdlPaymentCallbacks } = opts;

    async function initTabbyPaymentsCron() {
        
        const tabbyPaymentsSchedule = '* * * * *';

        nodeCron.schedule(tabbyPaymentsSchedule, tabbyPayments);

        return true;
    }

    const tabbyPayments = async function tabbyPayments() {

        await mdlPaymentCallbacks.tabbyCallbackCron();
    
    }

    async function init() {

        await initTabbyPaymentsCron();
      
        return true;
    }

    return {
        init,
    }
}