// Controller file - completely rewritten
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel"
], function(Controller, MessageToast, MessageBox, BusyIndicator, JSONModel) {
    "use strict";

    return Controller.extend("employee.controller.OTPVerification", {
        onInit: function() {
            // Initialize countdown timer
            this._iCountdownInterval = null;
            this._iTimeRemaining = 120; // 2 minutes in seconds
            
            // Get encrypted ID from route parameters
            const oRoute = this.getOwnerComponent().getRouter().getRoute("otp-verification");
            oRoute.attachPatternMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function(oEvent) {
            const oArguments = oEvent.getParameter("arguments");
            this._sEncryptedId = oArguments.encryptedId;
            
            // Reset UI
            this._resetOTPInputs();
            this._startCountdown();
            
            // Disable validate button initially
            this.byId("validateButton")
        },
        
        _resetOTPInputs: function() {
            // Clear all OTP input fields
            for (let i = 1; i <= 6; i++) {
                this.byId(`otpInput${i}`).setValue("");
            }
        },
        
        _startCountdown: function() {
            // Clear any existing countdown
            if (this._iCountdownInterval) {
                clearInterval(this._iCountdownInterval);
            }
            
            // Reset time remaining
            this._iTimeRemaining = 120; // 2 minutes
            
            // Update the countdown display immediately
            this._updateCountdownDisplay();
            
            // Start the countdown interval
            this._iCountdownInterval = setInterval(() => {
                this._iTimeRemaining--;
                this._updateCountdownDisplay();
                
                if (this._iTimeRemaining <= 0) {
                    clearInterval(this._iCountdownInterval);
                    this._iCountdownInterval = null;
                    
                    // Disable OTP validation when time expires
                    this.byId("validateButton")
                    MessageBox.warning("OTP has expired. Please request a new OTP.");
                }
            }, 1000);
        },
        
        _updateCountdownDisplay: function() {
            const minutes = Math.floor(this._iTimeRemaining / 60);
            const seconds = this._iTimeRemaining % 60;
            const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            this.byId("otpCountdownLabel").setText(`OTP : (expires in ${formattedTime})`);
        },
        
        onOtpLiveChange: function(oEvent) {
            const oInput = oEvent.getSource();
            const sValue = oEvent.getParameter("value");
            const sInputId = oInput.getId();
            
            // Get the input number from the ID (e.g., "otpInput1" -> 1)
            const iInputNumber = parseInt(sInputId.slice(-1));
            
            // Move focus to the next input if a value was entered
            if (sValue && iInputNumber < 6) {
                this.byId(`otpInput${iInputNumber + 1}`).focus();
            }
            
            // Check if all OTP fields are filled
            this._checkOTPComplete();
        },
        
        _checkOTPComplete: function() {
            let bAllFilled = true;
            let sOTP = "";
            
            for (let i = 1; i <= 6; i++) {
                const sValue = this.byId(`otpInput${i}`).getValue();
                if (!sValue) {
                    bAllFilled = false;
                    break;
                }
                sOTP += sValue;
            }
            
            // Enable validate button only if all fields are filled and countdown is active
            this.byId("validateButton").setEnabled(bAllFilled && this._iCountdownInterval !== null);
            
            return bAllFilled ? sOTP : null;
        },
        
        onValidate: function() {
            const sOTP = this._checkOTPComplete();
            
            if (!sOTP) {
                MessageBox.error("Please enter a valid 6-digit OTP");
                return;
            }
            
            BusyIndicator.show(0);
            
            // Make API call to verify OTP
            this._verifyOTP(this._sEncryptedId, sOTP)
                .then((oResponse) => {
                    BusyIndicator.hide();
                    
                    if (oResponse.success) {
                        // Set user as authenticated
                        this._setUserAuthenticated(oResponse.userData);
                        
                        // Navigate to employee dashboard
                        this.getOwnerComponent().getRouter().navTo("employee", {}, true);
                    } else {
                        MessageBox.error(oResponse.message || "Invalid OTP. Please try again.");
                        // Clear OTP inputs on error
                        this._resetOTPInputs();
                        this.byId("otpInput1").focus();
                    }
                })
                .catch((oError) => {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to verify OTP. Please try again later.");
                    console.error("OTP verification error:", oError);
                });
        },
        
        reSendOTP: function() {
            BusyIndicator.show(0);
            
            // Make API call to resend OTP
            this._resendOTP(this._sEncryptedId)
                .then((oResponse) => {
                    BusyIndicator.hide();
                    
                    if (oResponse.success) {
                        MessageToast.show("OTP has been resent to your registered email");
                        // Reset OTP inputs and restart countdown
                        this._resetOTPInputs();
                        this._startCountdown();
                        this.byId("otpInput1").focus();
                    } else {
                        MessageBox.error(oResponse.message || "Failed to resend OTP. Please try again.");
                    }
                })
                .catch((oError) => {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to resend OTP. Please try again later.");
                    // console.error("OTP resend error:", oError);
                });
        },
        
        _verifyOTP: function(sEncryptedId, sOTP) {
            // Return a Promise that resolves with the API response
            return new Promise((resolve, reject) => {
                // Replace with your actual API endpoint
                const sUrl = "/api/verify-otp";
                
                // Prepare request data
                const oData = {
                    encryptedId: sEncryptedId,
                    otp: sOTP
                };
                
                // Make AJAX call
                $.ajax({
                    url: sUrl,
                    type: "POST",
                    data: JSON.stringify(oData),
                    contentType: "application/json",
                    success: function(oResponse) {
                        resolve(oResponse);
                    },
                    error: function(oXHR, sStatus, sError) {
                        reject({
                            xhr: oXHR,
                            status: sStatus,
                            error: sError
                        });
                    }
                });
            });
        },
        
        _resendOTP: function(sEncryptedId) {
            // Return a Promise that resolves with the API response
            return new Promise((resolve, reject) => {
                // Replace with your actual API endpoint
                const sUrl = "/api/resend-otp";
                
                // Prepare request data
                const oData = {
                    encryptedId: sEncryptedId
                };
                
                // Make AJAX call
                $.ajax({
                    url: sUrl,
                    type: "POST",
                    data: JSON.stringify(oData),
                    contentType: "application/json",
                    success: function(oResponse) {
                        resolve(oResponse);
                    },
                    error: function(oXHR, sStatus, sError) {
                        reject({
                            xhr: oXHR,
                            status: sStatus,
                            error: sError
                        });
                    }
                });
            });
        },
        
        _setUserAuthenticated: function(oUserData) {
            // Set user model with actual user data
            const oUserModel = new JSONModel({
                id: oUserData.id,
                name: oUserData.name,
                email: oUserData.email,
                authenticated: true,
                // Add any other user properties as needed
                role: oUserData.role,
                department: oUserData.department
            });
            
            this.getOwnerComponent().setModel(oUserModel, "currentUser");
        },
        
        onExit: function() {
            // Clean up countdown timer when exiting the view
            if (this._iCountdownInterval) {
                clearInterval(this._iCountdownInterval);
                this._iCountdownInterval = null;
            }
        }
    });
});
