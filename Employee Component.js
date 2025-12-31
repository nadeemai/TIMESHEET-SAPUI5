UPDATED CODE 5

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

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            // 🔐 Global auth model using timesheetServiceV2
            const oAuthModel = new sap.ui.model.json.JSONModel({
                encryptedEmployeeId: "" // Will be set dynamically
            });
            this.setModel(oAuthModel, "authModel");

            this.getRouter().initialize();
            this._checkOTPVerification();
        },

        _checkCurrentUser: function () {
            return new Promise((resolve, reject) => {
                let oUserModel = this.getModel("userAPIService");

                if (oUserModel) {
                    oUserModel.callFunction("/getCurrentUser", {
                        method: "GET",
                        success: (oData) => {
                            console.log("User API Response:", oData);

                            let user = oData.getCurrentUser;

                            if (user.authenticated && user.employeeFound) {
                                // Store user in a global model
                                this.setModel(new sap.ui.model.json.JSONModel(user), "currentUser");
                                resolve(user);
                            } 
                            else {
                                reject(new Error("User not authorized. Please contact admin."));
                            }
                        },
                        error: (oError) => {
                            console.error("User API Error:", oError);
                            reject(new Error("Unable to fetch user information."));
                        }
                    });
                } else {
                    reject(new Error("User API service not available"));
                }
            });
        },

        _checkOTPVerification: function () {
            const sHash = window.location.hash;

            // If already on OTP page, do nothing
            if (sHash && sHash.includes("OTPVerification")) {
                return;
            }

            // Get current user to generate dynamic encrypted ID
            this._checkCurrentUser().then(user => {
                if (user && user.employeeID) {
                    // Generate encrypted ID based on employee ID
                    const encryptedId = this._generateEncryptedId(user.employeeID);
                    
                    // Store in model
                    this.getModel("authModel").setProperty("/encryptedEmployeeId", encryptedId);
                    
                    // Navigate to OTP verification with the dynamic encrypted ID
                    this.getRouter().navTo(
                        "otp-verification-with-token",
                        { encryptedId: encryptedId },
                        true
                    );
                } else {
                    sap.m.MessageBox.error(
                        "Unable to verify employee identity. Please contact support."
                    );
                }
            }).catch(err => {
                console.error("Failed to get current user:", err);
                
                // Try to get from session storage as fallback
                const storedId = sessionStorage.getItem("employeeId") || localStorage.getItem("employeeId");
                if (storedId) {
                    const encryptedId = this._generateEncryptedId(storedId);
                    
                    // Store in model
                    this.getModel("authModel").setProperty("/encryptedEmployeeId", encryptedId);
                    
                    // Navigate to OTP verification with the encrypted ID
                    this.getRouter().navTo(
                        "otp-verification-with-token",
                        { encryptedId: encryptedId },
                        true
                    );
                } else {
                    sap.m.MessageBox.error(
                        "Unable to verify employee identity. Please contact support."
                    );
                }
            });
        },
        
        _generateEncryptedId: function(employeeId) {
            // Generate a 32-character hexadecimal string that matches the format in the image
            // This is a more sophisticated hash function that produces a consistent 32-char hex string
            
            // Create a hash from the employee ID
            let hash = 0;
            const str = employeeId.toString() + new Date().getTime().toString();
            
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            
            // Convert to positive and then to hex
            const positiveHash = Math.abs(hash);
            let hexHash = positiveHash.toString(16);
            
            // If the hash is too short, extend it with additional hashing
            if (hexHash.length < 32) {
                let tempHash = hash;
                while (hexHash.length < 32) {
                    tempHash = ((tempHash << 3) - tempHash) + str.length;
                    tempHash = tempHash & tempHash;
                    hexHash += Math.abs(tempHash).toString(16);
                }
            }
            
            // Ensure it's exactly 32 characters long by padding with zeros or truncating
            while (hexHash.length < 32) {
                hexHash = "0" + hexHash;
            }
            if (hexHash.length > 32) {
                hexHash = hexHash.substring(0, 32);
            }
            
            return hexHash;
        },
        
        _getEncryptedEmployeeId: function () {
            // This method is now deprecated in favor of _generateEncryptedId
            // but kept for backward compatibility
            const sEmployeeId = "EMP0024"; // This should be replaced with actual employee ID
            return this._generateEncryptedId(sEmployeeId);
        }
    });
});



UPDATED CODE 3

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

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            // 🔐 Global auth model using timesheetServiceV2
            const oAuthModel = new sap.ui.model.json.JSONModel({
                encryptedEmployeeId: "e4977ed8a797696718cb50430b1db736"
            });
            this.setModel(oAuthModel, "authModel");

            this.getRouter().initialize();
            this._checkOTPVerification();
        },

        _checkCurrentUser: function () {
            let oUserModel = this.getModel("userAPIService");

            oUserModel.callFunction("/getCurrentUser", {
                method: "GET",
                success: (oData) => {
                    console.log("User API Response:", oData);

                    let user = oData.getCurrentUser;

                    if (user.authenticated && user.employeeFound) {
                        // Store user in a global model
                        this.setModel(new sap.ui.model.json.JSONModel(user), "currentUser");

                        // Route to Employee Dashboard
                        this.getRouter().navTo("employee", {}, true);
                    } 
                    else {
                        sap.m.MessageBox.error(
                            "User not authorized. Please contact admin."
                        );
                    }
                },
                error: (oError) => {
                    console.error("User API Error:", oError);
                    sap.m.MessageToast.show("Unable to fetch user information.");
                }
            });
        },

        _checkOTPVerification: function () {
            const sHash = window.location.hash;

            // If already on OTP page, do nothing
            if (sHash && sHash.includes("OTPVerification")) {
                return;
            }

            // Read encrypted ID from model (or generate once)
            let sEncryptedId =
                this.getModel("authModel").getProperty("/encryptedEmployeeId");

            if (!sEncryptedId) {
                sEncryptedId = this._getEncryptedEmployeeId();
            }

            if (sEncryptedId) {
                this.getRouter().navTo(
                    "otp-verification-with-token",
                    { encryptedId: sEncryptedId },
                    true
                );
            } else {
                sap.m.MessageBox.error(
                    "Unable to verify employee identity. Please contact support."
                );
            }
        },
        
        _getEncryptedEmployeeId: function () {
            const sEncryptedId = "e4977ed8a797696718cb50430b1db736"; // example

            // Store in model
            this.getModel("authModel")
                .setProperty("/encryptedEmployeeId", sEncryptedId);

            return sEncryptedId;
        }
    });
});



UPDATED CODE 2

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

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            // 🔐 Global auth model using timesheetServiceV2
            const oAuthModel = new sap.ui.model.json.JSONModel({
                encryptedEmployeeId: "e4977ed8a797696718cb50430b1db736"
            });
            this.setModel(oAuthModel, "authModel");

            this.getRouter().initialize();
            this._checkOTPVerification();
        },

        _checkCurrentUser: function () {
            let oUserModel = this.getModel("userAPIService");

            oUserModel.callFunction("/getCurrentUser", {
                method: "GET",
                success: (oData) => {
                    console.log("User API Response:", oData);

                    let user = oData.getCurrentUser;

                    if (user.authenticated && user.employeeFound) {
                        // Store user in a global model
                        this.setModel(new sap.ui.model.json.JSONModel(user), "currentUser");

                        // Route to Employee Dashboard
                        this.getRouter().navTo("employee", {}, true);
                    } 
                    else {
                        sap.m.MessageBox.error(
                            "User not authorized. Please contact admin."
                        );
                    }
                },
                error: (oError) => {
                    console.error("User API Error:", oError);
                    sap.m.MessageToast.show("Unable to fetch user information.");
                }
            });
        },

        _checkOTPVerification: function () {
            const sHash = window.location.hash;

            // If already on OTP page, do nothing
            if (sHash && sHash.includes("OTPVerification")) {
                return;
            }

            // Read encrypted ID from model (or generate once)
            let sEncryptedId =
                this.getModel("authModel").getProperty("/encryptedEmployeeId");

            if (!sEncryptedId) {
                sEncryptedId = this._getEncryptedEmployeeId();
            }

            if (sEncryptedId) {
                this.getRouter().navTo(
                    "otp-verification-with-token",
                    { encryptedId: sEncryptedId },
                    true
                );
            } else {
                sap.m.MessageBox.error(
                    "Unable to verify employee identity. Please contact support."
                );
            }
        },
        
        _getEncryptedEmployeeId: function () {
            const sEncryptedId = "e4977ed8a797696718cb50430b1db736"; // example

            // Store in model
            this.getModel("authModel")
                .setProperty("/encryptedEmployeeId", sEncryptedId);

            return sEncryptedId;
        }
    });
});



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
