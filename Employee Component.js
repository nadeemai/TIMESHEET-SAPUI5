sap.ui.define([
    "sap/ui/core/UIComponent",
    "employee/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("employee.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
            
            // Check if we need to show OTP verification
            this._checkOTPVerification();
        },
        
        _checkOTPVerification: function() {
            // Get current hash
            const sHash = window.location.hash;
            
            // If hash is empty or doesn't contain otp-verification, redirect to OTP
            if (!sHash || !sHash.includes("otp-verification")) {
                // Get encrypted employee ID (this should come from your authentication system)
                const sEncryptedId = this._getEncryptedEmployeeId();
                
                if (sEncryptedId) {
                    // Navigate to OTP verification
                    this.getRouter().navTo("otp-verification", {
                        encryptedId: sEncryptedId
                    }, true);
                } else {
                    // Handle error case
                    sap.m.MessageBox.error("Unable to verify employee identity. Please contact support.");
                }
            }
        },
        
        _getEncryptedEmployeeId: function() {
            // This method should return the encrypted employee ID
            // Implementation depends on your authentication system
            // For now, returning a placeholder
            return "ENCRYPTED_EMPLOYEE_ID";
        }
    });
});
