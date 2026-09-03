export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["UNKNOWN"] = "UNKNOWN";
})(PaymentStatus || (PaymentStatus = {}));
export var RecoveryStatus;
(function (RecoveryStatus) {
    RecoveryStatus["DETECTED"] = "DETECTED";
    RecoveryStatus["DIAGNOSING"] = "DIAGNOSING";
    RecoveryStatus["PLANNED"] = "PLANNED";
    RecoveryStatus["POLICY_CHECK"] = "POLICY_CHECK";
    RecoveryStatus["READY"] = "READY";
    RecoveryStatus["EXECUTING"] = "EXECUTING";
    RecoveryStatus["VERIFYING"] = "VERIFYING";
    RecoveryStatus["PROMISE_TO_PAY"] = "PROMISE_TO_PAY";
    RecoveryStatus["RECOVERED"] = "RECOVERED";
    RecoveryStatus["RETRY_SCHEDULED"] = "RETRY_SCHEDULED";
    RecoveryStatus["ESCALATED"] = "ESCALATED";
    RecoveryStatus["STOPPED"] = "STOPPED";
    RecoveryStatus["FAILED"] = "FAILED";
})(RecoveryStatus || (RecoveryStatus = {}));
export var FailureCategory;
(function (FailureCategory) {
    FailureCategory["TRANSIENT"] = "TRANSIENT";
    FailureCategory["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    FailureCategory["BANK_FAILURE"] = "BANK_FAILURE";
    FailureCategory["NETWORK_FAILURE"] = "NETWORK_FAILURE";
    FailureCategory["ABANDONMENT"] = "ABANDONMENT";
    FailureCategory["UNKNOWN"] = "UNKNOWN";
})(FailureCategory || (FailureCategory = {}));
export var RecoveryActionType;
(function (RecoveryActionType) {
    RecoveryActionType["IMMEDIATE_RETRY"] = "IMMEDIATE_RETRY";
    RecoveryActionType["DELAYED_RETRY"] = "DELAYED_RETRY";
    RecoveryActionType["REMINDER"] = "REMINDER";
    RecoveryActionType["SCHEDULE_PROMISE"] = "SCHEDULE_PROMISE";
    RecoveryActionType["ESCALATE"] = "ESCALATE";
})(RecoveryActionType || (RecoveryActionType = {}));
export var CustomerIntent;
(function (CustomerIntent) {
    CustomerIntent["PAY_LATER"] = "PAY_LATER";
    CustomerIntent["READY_NOW"] = "READY_NOW";
    CustomerIntent["CANCEL_ORDER"] = "CANCEL_ORDER";
    CustomerIntent["DISPUTE"] = "DISPUTE";
})(CustomerIntent || (CustomerIntent = {}));
