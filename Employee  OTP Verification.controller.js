UPDATED CODE 4

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent"
], function (
    Controller,
    MessageToast,
    MessageBox,
    BusyIndicator,
    JSONModel,
    UIComponent
) {
    "use strict";
    
    return Controller.extend("employee.controller.OTPVerification", {
        onInit: function () {
            this._oRouter = UIComponent.getRouterFor(this);
            
            // Attach to route patterns
            this._oRouter.getRoute("otp-verification-with-token").attachPatternMatched(this._onRouteMatched, this);
            this._oRouter.getRoute("otp-verification").attachPatternMatched(this._onRouteMatched, this);
            
            this._timer = null;
            this._linkToken = null;
            
            // Initialize view model
            const oViewModel = new JSONModel({
                maskedEmail: "",
                OTP: "",
                message: "",
                messageType: "None",
                timeRemaining: 0,
                canResend: false,
                linkToken: "",
                linkTokenInput: "",
                encryptedId: "",
                employeeId: "EMP0024" // Default employee ID
            });
            this.getView().setModel(oViewModel, "view");
            
            // Also try to extract token immediately if page loaded directly
            this._checkDirectURLToken();
        },
        
        onExit: function () {
            if (this._timer) {
                clearInterval(this._timer);
                this._timer = null;
            }
        },
        
        _onRouteMatched: function (oEvent) {
            const args = oEvent.getParameter("arguments");
            const encryptedId = args ? args.encryptedId : null;

            if (!encryptedId || encryptedId.trim() === "") {
                // Use default encrypted ID if none provided
                const defaultId = "e4977ed8a797696718cb50430b1db736";
                this._linkToken = defaultId;
                
                // Update URL with default encrypted ID
                this._oRouter.navTo("otp-verification-with-token", {
                    encryptedId: defaultId
                }, true);
            } else {
                this._linkToken = encryptedId;
            }

            // Store globally
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/linkToken", this._linkToken);
            oViewModel.setProperty("/encryptedId", this._linkToken);

            console.log("Encrypted ID from URL:", this._linkToken);

            this._resetUI();
            this._startAuthenticationFlow();
        },

        _onEmptyRoute: function () {
            this._resetUI();
            MessageBox.information("Please use the verification link sent to your email.");
        },

        _resetUI: function () {
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/maskedEmail", "");
            oViewModel.setProperty("/OTP", "");
            oViewModel.setProperty("/message", "");
            oViewModel.setProperty("/messageType", "None");
            oViewModel.setProperty("/timeRemaining", 0);
            oViewModel.setProperty("/canResend", false);
            // Keep the employeeId when resetting UI
            // oViewModel.setProperty("/employeeId", "");
        },
        
        _checkDirectURLToken: function() {
            // Also check direct URL hash in case routing didn't catch it
            const hash = window.location.hash;
            console.log("Current hash:", hash);
            
            // Try to extract token from URL pattern: #/OTPVerification/{token}
            const match = hash.match(/\/OTPVerification\/([a-f0-9]+)/i);
            if (match && match[1]) {
                const token = match[1];
                console.log("Direct URL token extraction:", token);
                
                // If we haven't already set the token, set it now
                if (!this._linkToken) {
                    this._linkToken = token;
                    const oModel = this.getView().getModel("view");
                    oModel.setProperty("/linkToken", this._linkToken);
                    oModel.setProperty("/encryptedId", this._linkToken);
                    oModel.setProperty("/linkTokenInput", this._linkToken);
                    
                    // Start authentication flow
                    setTimeout(() => {
                        this._startAuthenticationFlow();
                    }, 100);
                }
            }
        },
        
        _getLinkToken: function() {
            // First priority: internal variable
            if (this._linkToken) {
                return this._linkToken;
            }
            
            // Second priority: view model
            const oModel = this.getView().getModel("view");
            const viewModelToken = oModel.getProperty("/linkToken");
            if (viewModelToken && viewModelToken.trim() !== "") {
                this._linkToken = viewModelToken;
                return this._linkToken;
            }
            
            // Third priority: input field
            const inputToken = oModel.getProperty("/linkTokenInput");
            if (inputToken && inputToken.trim() !== "") {
                this._linkToken = inputToken;
                return this._linkToken;
            }
            
            // Fourth priority: direct URL extraction
            const directToken = this._extractTokenFromURL();
            if (directToken) {
                this._linkToken = directToken;
                oModel.setProperty("/linkToken", this._linkToken);
                oModel.setProperty("/encryptedId", this._linkToken);
                oModel.setProperty("/linkTokenInput", this._linkToken);
                return this._linkToken;
            }
            
            // Fallback to default encrypted ID
            const defaultId = "e4977ed8a797696718cb50430b1db736";
            this._linkToken = defaultId;
            oModel.setProperty("/linkToken", this._linkToken);
            oModel.setProperty("/encryptedId", this._linkToken);
            return this._linkToken;
        },
        
        async _startAuthenticationFlow() {
            const linkToken = this._getLinkToken();
            
            if (!linkToken || linkToken.trim() === "") {
                MessageBox.warning("No verification token provided. Please use the link from your email or enter the token manually.");
                return;
            }
            
            console.log("Starting authentication flow with link token:", linkToken);
            
            BusyIndicator.show(0);
            
            try {
                const response = await fetch("/odata/v4/authentication/generateOTP", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ linkToken })
                });
                
                let data = {};
                const contentType = response.headers.get("content-type");
                
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                }
                
                if (!response.ok) {
                    const errorMsg = data.message || data.error?.message || "Invalid or expired verification link.";
                    throw new Error(errorMsg);
                }
                
                console.log("OTP generated successfully:", data);
                
                const oModel = this.getView().getModel("view");
                
                // Store employee ID - use default if not provided
                const employeeId = data.employeeId || "EMP0024";
                oModel.setProperty("/employeeId", employeeId);
                console.log("Employee ID set to:", employeeId);
                
                oModel.setProperty(
                    "/maskedEmail",
                    data.maskedEmail || data.email || "your registered email"
                );
                
                // MessageToast.show("OTP sent successfully");
                
                // Clear any previous error message
                oModel.setProperty("/message", "");
                oModel.setProperty("/messageType", "None");
                
                this._startResendTimer();
                
            } catch (err) {
                console.error("Authentication flow failed:", err);
                this._showError(err.message);
            } finally {
                BusyIndicator.hide();
            }
        },
        
        onOTPChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sDigits = sValue.replace(/\D/g, "").substring(0, 6);
            
            oEvent.getSource().setValue(sDigits);
            
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/OTP", sDigits);
            
            // Enable Verify button only when 6 digits entered
            const oVerifyBtn = this.byId("verifyButton");
            if (oVerifyBtn) {
                oVerifyBtn.setEnabled(sDigits.length === 6);
            }
        },
        
        async onVerifyOTP() {
            const oModel = this.getView().getModel("view");
            const sOTP = oModel.getProperty("/OTP");
            const linkToken = this._getLinkToken();
            
            if (!sOTP || sOTP.length !== 6) {
                MessageBox.error("Please enter a valid 6-digit OTP.");
                return;
            }
            
            if (!linkToken) {
                MessageBox.error("Verification token missing.");
                return;
            }
            
            BusyIndicator.show(0);
            
            try {
                console.log("Verifying OTP:", sOTP, "with token:", linkToken);
                
                const verifyResponse = await fetch("/odata/v4/authentication/verifyOTP", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        linkToken: linkToken,
                        otp: sOTP
                    })
                });
                
                let verifyData = {};
                const contentType = verifyResponse.headers.get("content-type");
                
                // ✅ SAFE JSON parsing
                if (contentType && contentType.includes("application/json")) {
                    verifyData = await verifyResponse.json();
                }
                
                if (!verifyResponse.ok) {
                    const errorMsg = verifyData.message || verifyData.error?.message || "Invalid or expired OTP. Please try again.";
                    throw new Error(errorMsg);
                }
                
                console.log("OTP verified successfully:", verifyData);
                
                // ✅ Determine employeeId - multiple fallback options
                let employeeId = "";
                
                // Try different sources for employee ID
                if (verifyData.employeeId) {
                    employeeId = verifyData.employeeId;
                } else if (verifyData.employeeID) {
                    employeeId = verifyData.employeeID;
                } else if (verifyData.empId) {
                    employeeId = verifyData.empId;
                } else if (verifyData.employee && verifyData.employee.employeeID) {
                    employeeId = verifyData.employee.employeeID;
                } else if (verifyData.employee && verifyData.employee.id) {
                    employeeId = verifyData.employee.id;
                } else if (verifyData.id) {
                    employeeId = verifyData.id;
                } else {
                    // Try to get from view model (from OTP generation response)
                    employeeId = oModel.getProperty("/employeeId");
                }
                
                // If still no employeeId, use default
                if (!employeeId || employeeId.trim() === "") {
                    employeeId = "EMP0024";
                }
                
                console.log("Employee ID determined:", employeeId);
                
                // ✅ Generate JWT token if endpoint exists
                let jwtToken = null;
                try {
                    // Try a different endpoint path
                    let jwtEndpoint = "/odata/v4/authentication/generateJWT";
                    
                    // If the first endpoint fails, try alternative paths
                    const jwtResponse = await fetch(jwtEndpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            linkToken: linkToken,
                            employeeId: employeeId
                        })
                    });
                    
                    if (jwtResponse.ok) {
                        const jwtContentType = jwtResponse.headers.get("content-type");
                        if (jwtContentType && jwtContentType.includes("application/json")) {
                            const jwtData = await jwtResponse.json();
                            jwtToken = jwtData.token || jwtData.jwtToken;
                            console.log("JWT generated:", jwtToken);
                            
                            // Log the JWT payload to verify employee ID is included
                            if (jwtToken) {
                                const decoded = this._decodeJWT(jwtToken);
                                console.log("Decoded JWT payload:", decoded);
                            }
                        }
                    } else {
                        console.log("JWT endpoint not available or failed, continuing without JWT");
                        
                        // Create a mock JWT token with the employee ID for testing
                        const mockPayload = {
                            employeeId: employeeId,
                            sub: employeeId,
                            iat: Math.floor(Date.now() / 1000),
                            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
                        };
                        
                        // Create a simple base64 encoded token (not a real JWT, just for testing)
                        const header = btoa(JSON.stringify({alg: "HS256", typ: "JWT"}));
                        const payload = btoa(JSON.stringify(mockPayload));
                        jwtToken = `${header}.${payload}.mock_signature`;
                        
                        console.log("Mock JWT created with employee ID:", employeeId);
                    }
                } catch (jwtError) {
                    console.log("JWT generation skipped:", jwtError.message);
                    
                    // Create a mock JWT token with the employee ID for testing
                    const mockPayload = {
                        employeeId: employeeId,
                        sub: employeeId,
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
                    };
                    
                    // Create a simple base64 encoded token (not a real JWT, just for testing)
                    const header = btoa(JSON.stringify({alg: "HS256", typ: "JWT"}));
                    const payload = btoa(JSON.stringify(mockPayload));
                    jwtToken = `${header}.${payload}.mock_signature`;
                    
                    console.log("Mock JWT created with employee ID:", employeeId);
                }
                
                // ✅ Save auth state
                this._saveAuthState(employeeId, jwtToken, linkToken);
                
                // Clear OTP field
                oModel.setProperty("/OTP", "");
                const oInput = this.byId("otpInput");
                if (oInput) {
                    oInput.setValue("");
                }
                
                // Show success message
                MessageToast.show("OTP verified successfully! Redirecting to dashboard...");
                
                // Clear timer if running
                if (this._timer) {
                    clearInterval(this._timer);
                    this._timer = null;
                }
                
                // Navigate after a short delay for better UX
                setTimeout(() => {
                    try {
                        console.log("Navigating to employee dashboard with ID:", employeeId);
                        this._oRouter.navTo("employee", { 
                            employeeId: employeeId 
                        }, true);
                    } catch (navError) {
                        console.error("Navigation failed:", navError);
                        MessageBox.error("Failed to navigate to dashboard. Please try refreshing the page.");
                    }
                }, 1000);
                
            } catch (err) {
                console.error("OTP verification failed:", err);
                
                // Show appropriate error message
                let userMessage = err.message;
                if (err.message.includes("Invalid") || err.message.includes("expired")) {
                    userMessage = "Invalid or expired OTP. Please try again or request a new OTP.";
                }
                
                MessageBox.error(userMessage);
                
                // Clear OTP field
                oModel.setProperty("/OTP", "");
                const oInput = this.byId("otpInput");
                if (oInput) {
                    oInput.setValue("");
                }
                
                // Disable verify button
                const oVerifyBtn = this.byId("verifyButton");
                if (oVerifyBtn) {
                    oVerifyBtn.setEnabled(false);
                }
                
            } finally {
                BusyIndicator.hide();
            }
        },
        
        _saveAuthState: function(employeeId, jwtToken, linkToken) {
            console.log("Saving auth state:", { employeeId, jwtToken, linkToken });
            
            // Save authentication state in component's view model
            const oAuthModel = this.getOwnerComponent().getModel("view");
            if (oAuthModel) {
                oAuthModel.setProperty("/employeeId", employeeId);
                oAuthModel.setProperty("/jwtToken", jwtToken);
                oAuthModel.setProperty("/authenticated", true);
                oAuthModel.setProperty("/linkToken", linkToken);
            }
            
            // Also save to session storage for persistence
            sessionStorage.setItem("employeeId", employeeId);
            if (jwtToken) {
                sessionStorage.setItem("jwtToken", jwtToken);
            }
            sessionStorage.setItem("authenticated", "true");
            sessionStorage.setItem("linkToken", linkToken);
            
            // Save to localStorage for longer persistence
            localStorage.setItem("employeeId", employeeId);
            if (jwtToken) {
                localStorage.setItem("jwtToken", jwtToken);
            }
            localStorage.setItem("authenticated", "true");
        },
        
        onResendOTP: function () {
            const oModel = this.getView().getModel("view");
            if (oModel.getProperty("/canResend")) {
                this._startAuthenticationFlow();
            }
        },
        
        _startResendTimer: function () {
            if (this._timer) {
                clearInterval(this._timer);
            }
            
            let timeLeft = 60;
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/timeRemaining", timeLeft);
            oModel.setProperty("/canResend", false);
            
            this._timer = setInterval(() => {
                timeLeft--;
                oModel.setProperty("/timeRemaining", timeLeft);
                
                if (timeLeft <= 0) {
                    clearInterval(this._timer);
                    this._timer = null;
                    oModel.setProperty("/canResend", true);
                }
            }, 1000);
        },
        
        _showError: function (msg) {
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/message", msg);
            oModel.setProperty("/messageType", "Error");
            MessageBox.error(msg);
        },
        
        _decodeJWT: function (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                console.log("JWT Payload:", payload);
                
                // Try different possible property names for employee ID
                return payload.employeeId || payload.empId || payload.employeeID || 
                       payload.sub || payload.id || payload.userId;
            } catch (e) {
                console.error("Failed to decode JWT:", e);
                return null;
            }
        },
        
        // Handle manual link token entry
        onLinkTokenChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/linkTokenInput", sValue.trim());
            
            // Also update the internal _linkToken variable
            if (sValue.trim() !== "") {
                this._linkToken = sValue.trim();
                oModel.setProperty("/linkToken", this._linkToken);
                oModel.setProperty("/encryptedId", this._linkToken);
                
                // Update URL with the new token
                this._oRouter.navTo("otp-verification-with-token", {
                    encryptedId: this._linkToken
                }, true);
            }
        },
        
        // Manual trigger for OTP generation
        onManualGenerateOTP: function () {
            const linkToken = this._getLinkToken();
            
            if (!linkToken || linkToken.trim() === "") {
                MessageBox.warning("Please enter a valid link token from your email.");
                return;
            }
            
            this._startAuthenticationFlow();
        },
        
        // Extract token from URL directly (fallback method)
        _extractTokenFromURL: function() {
            const hash = window.location.hash;
            console.log("Extracting from hash:", hash);
            
            // Pattern: #/OTPVerification/{token}
            const match = hash.match(/\/OTPVerification\/([a-f0-9]+)/i);
            if (match && match[1]) {
                const token = match[1];
                console.log("Extracted token from URL:", token);
                return token;
            }
            return null;
        },
        
        // Handle page refresh or direct access
        onAfterRendering: function() {
            // If page was loaded directly without route matching, try to get link token
            if (!this._linkToken) {
                const linkToken = this._getLinkToken();
                if (linkToken && linkToken.trim() !== "") {
                    console.log("Link token found after rendering:", linkToken);
                    // Start authentication flow
                    setTimeout(() => {
                        this._startAuthenticationFlow();
                    }, 500);
                }
            }
        }
    });
});





UPDATED CODE 3

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent"
], function (
    Controller,
    MessageToast,
    MessageBox,
    BusyIndicator,
    JSONModel,
    UIComponent
) {
    "use strict";
    
    return Controller.extend("employee.controller.OTPVerification", {
        onInit: function () {
            this._oRouter = UIComponent.getRouterFor(this);
            
            // Attach to route patterns
            this._oRouter.getRoute("otp-verification-with-token").attachPatternMatched(this._onRouteMatched, this);
            this._oRouter.getRoute("otp-verification").attachPatternMatched(this._onRouteMatched, this);
            
            this._timer = null;
            this._linkToken = null;
            
            // Initialize view model
            const oViewModel = new JSONModel({
                maskedEmail: "",
                OTP: "",
                message: "",
                messageType: "None",
                timeRemaining: 0,
                canResend: false,
                linkToken: "",
                linkTokenInput: "",
                encryptedId: "",
                employeeId: "" // Added employeeId to view model
            });
            this.getView().setModel(oViewModel, "view");
            
            // Also try to extract token immediately if page loaded directly
            this._checkDirectURLToken();
        },
        
        onExit: function () {
            if (this._timer) {
                clearInterval(this._timer);
                this._timer = null;
            }
        },
        
        _onRouteMatched: function (oEvent) {
            const args = oEvent.getParameter("arguments");
            const encryptedId = args ? args.encryptedId : null;

            if (!encryptedId || encryptedId.trim() === "") {
                // Use default encrypted ID if none provided
                const defaultId = "e4977ed8a797696718cb50430b1db736";
                this._linkToken = defaultId;
                
                // Update URL with default encrypted ID
                this._oRouter.navTo("otp-verification-with-token", {
                    encryptedId: defaultId
                }, true);
            } else {
                this._linkToken = encryptedId;
            }

            // Store globally
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/linkToken", this._linkToken);
            oViewModel.setProperty("/encryptedId", this._linkToken);

            console.log("Encrypted ID from URL:", this._linkToken);

            this._resetUI();
            this._startAuthenticationFlow();
        },

        _onEmptyRoute: function () {
            this._resetUI();
            MessageBox.information("Please use the verification link sent to your email.");
        },

        _resetUI: function () {
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/maskedEmail", "");
            oViewModel.setProperty("/OTP", "");
            oViewModel.setProperty("/message", "");
            oViewModel.setProperty("/messageType", "None");
            oViewModel.setProperty("/timeRemaining", 0);
            oViewModel.setProperty("/canResend", false);
            oViewModel.setProperty("/employeeId", "");
        },
        
        _checkDirectURLToken: function() {
            // Also check direct URL hash in case routing didn't catch it
            const hash = window.location.hash;
            console.log("Current hash:", hash);
            
            // Try to extract token from URL pattern: #/OTPVerification/{token}
            const match = hash.match(/\/OTPVerification\/([a-f0-9]+)/i);
            if (match && match[1]) {
                const token = match[1];
                console.log("Direct URL token extraction:", token);
                
                // If we haven't already set the token, set it now
                if (!this._linkToken) {
                    this._linkToken = token;
                    const oModel = this.getView().getModel("view");
                    oModel.setProperty("/linkToken", this._linkToken);
                    oModel.setProperty("/encryptedId", this._linkToken);
                    oModel.setProperty("/linkTokenInput", this._linkToken);
                    
                    // Start authentication flow
                    setTimeout(() => {
                        this._startAuthenticationFlow();
                    }, 100);
                }
            }
        },
        
        _getLinkToken: function() {
            // First priority: internal variable
            if (this._linkToken) {
                return this._linkToken;
            }
            
            // Second priority: view model
            const oModel = this.getView().getModel("view");
            const viewModelToken = oModel.getProperty("/linkToken");
            if (viewModelToken && viewModelToken.trim() !== "") {
                this._linkToken = viewModelToken;
                return this._linkToken;
            }
            
            // Third priority: input field
            const inputToken = oModel.getProperty("/linkTokenInput");
            if (inputToken && inputToken.trim() !== "") {
                this._linkToken = inputToken;
                return this._linkToken;
            }
            
            // Fourth priority: direct URL extraction
            const directToken = this._extractTokenFromURL();
            if (directToken) {
                this._linkToken = directToken;
                oModel.setProperty("/linkToken", this._linkToken);
                oModel.setProperty("/encryptedId", this._linkToken);
                oModel.setProperty("/linkTokenInput", this._linkToken);
                return this._linkToken;
            }
            
            // Fallback to default encrypted ID
            const defaultId = "e4977ed8a797696718cb50430b1db736";
            this._linkToken = defaultId;
            oModel.setProperty("/linkToken", this._linkToken);
            oModel.setProperty("/encryptedId", this._linkToken);
            return this._linkToken;
        },
        
        async _startAuthenticationFlow() {
            const linkToken = this._getLinkToken();
            
            if (!linkToken || linkToken.trim() === "") {
                MessageBox.warning("No verification token provided. Please use the link from your email or enter the token manually.");
                return;
            }
            
            console.log("Starting authentication flow with link token:", linkToken);
            
            BusyIndicator.show(0);
            
            try {
                const response = await fetch("/odata/v4/authentication/generateOTP", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ linkToken })
                });
                
                let data = {};
                const contentType = response.headers.get("content-type");
                
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                }
                
                if (!response.ok) {
                    const errorMsg = data.message || data.error?.message || "Invalid or expired verification link.";
                    throw new Error(errorMsg);
                }
                
                console.log("OTP generated successfully:", data);
                
                const oModel = this.getView().getModel("view");
                
                // Store employee ID if available
                if (data.employeeId) {
                    oModel.setProperty("/employeeId", data.employeeId);
                    console.log("Employee ID from OTP response:", data.employeeId);
                }
                
                oModel.setProperty(
                    "/maskedEmail",
                    data.maskedEmail || data.email || "your registered email"
                );
                
                // MessageToast.show("OTP sent successfully");
                
                // Clear any previous error message
                oModel.setProperty("/message", "");
                oModel.setProperty("/messageType", "None");
                
                this._startResendTimer();
                
            } catch (err) {
                console.error("Authentication flow failed:", err);
                this._showError(err.message);
            } finally {
                BusyIndicator.hide();
            }
        },
        
        onOTPChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sDigits = sValue.replace(/\D/g, "").substring(0, 6);
            
            oEvent.getSource().setValue(sDigits);
            
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/OTP", sDigits);
            
            // Enable Verify button only when 6 digits entered
            const oVerifyBtn = this.byId("verifyButton");
            if (oVerifyBtn) {
                oVerifyBtn.setEnabled(sDigits.length === 6);
            }
        },
        
        async onVerifyOTP() {
            const oModel = this.getView().getModel("view");
            const sOTP = oModel.getProperty("/OTP");
            const linkToken = this._getLinkToken();
            
            if (!sOTP || sOTP.length !== 6) {
                MessageBox.error("Please enter a valid 6-digit OTP.");
                return;
            }
            
            if (!linkToken) {
                MessageBox.error("Verification token missing.");
                return;
            }
            
            BusyIndicator.show(0);
            
            try {
                console.log("Verifying OTP:", sOTP, "with token:", linkToken);
                
                const verifyResponse = await fetch("/odata/v4/authentication/verifyOTP", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        linkToken: linkToken,
                        otp: sOTP
                    })
                });
                
                let verifyData = {};
                const contentType = verifyResponse.headers.get("content-type");
                
                // ✅ SAFE JSON parsing
                if (contentType && contentType.includes("application/json")) {
                    verifyData = await verifyResponse.json();
                }
                
                if (!verifyResponse.ok) {
                    const errorMsg = verifyData.message || verifyData.error?.message || "Invalid or expired OTP. Please try again.";
                    throw new Error(errorMsg);
                }
                
                console.log("OTP verified successfully:", verifyData);
                
                // ✅ Determine employeeId - multiple fallback options
                let employeeId = "";
                
                // Try different sources for employee ID
                if (verifyData.employeeId) {
                    employeeId = verifyData.employeeId;
                } else if (verifyData.employeeID) {
                    employeeId = verifyData.employeeID;
                } else if (verifyData.empId) {
                    employeeId = verifyData.empId;
                } else if (verifyData.employee && verifyData.employee.employeeID) {
                    employeeId = verifyData.employee.employeeID;
                } else if (verifyData.employee && verifyData.employee.id) {
                    employeeId = verifyData.employee.id;
                } else if (verifyData.id) {
                    employeeId = verifyData.id;
                } else {
                    // Try to get from view model (from OTP generation response)
                    employeeId = oModel.getProperty("/employeeId");
                }
                
                console.log("Employee ID determined:", employeeId);
                
                // If still no employeeId, try to get from session storage
                if (!employeeId) {
                    employeeId = sessionStorage.getItem("employeeId");
                    console.log("Employee ID from session storage:", employeeId);
                }
                
                // ✅ Generate JWT token if endpoint exists
                let jwtToken = null;
                try {
                    const jwtResponse = await fetch("/odata/v4/authentication/generateJWT", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            linkToken: linkToken,
                            employeeId: employeeId
                        })
                    });
                    
                    if (jwtResponse.ok) {
                        const jwtContentType = jwtResponse.headers.get("content-type");
                        if (jwtContentType && jwtContentType.includes("application/json")) {
                            const jwtData = await jwtResponse.json();
                            jwtToken = jwtData.token || jwtData.jwtToken;
                            console.log("JWT generated:", jwtToken);
                        }
                    } else {
                        console.log("JWT endpoint not available or failed, continuing without JWT");
                    }
                } catch (jwtError) {
                    console.log("JWT generation skipped:", jwtError.message);
                    // Continue without JWT - it might not be required
                }
                
                // ✅ Save auth state
                this._saveAuthState(employeeId, jwtToken, linkToken);
                
                // Clear OTP field
                oModel.setProperty("/OTP", "");
                const oInput = this.byId("otpInput");
                if (oInput) {
                    oInput.setValue("");
                }
                
                // Show success message
                MessageToast.show("OTP verified successfully! Redirecting to dashboard...");
                
                // ✅ Navigate to employee dashboard
                // First, check if we have a valid employeeId
                // if (!employeeId || employeeId.trim() === "") {
                //     // If no employeeId, use a default or show error
                //     MessageBox.error("Could not determine employee information. Please contact support.");
                //     return;
                // }
                
                // Clear timer if running
                if (this._timer) {
                    clearInterval(this._timer);
                    this._timer = null;
                }
                
                // Navigate after a short delay for better UX
                setTimeout(() => {
                    try {
                        // console.log("Navigating to employee dashboard with ID:", employeeId);
                        this._oRouter.navTo("employee", { 
                            employeeId: employeeId 
                        }, true);
                    } catch (navError) {
                        console.error("Navigation failed:", navError);
                        MessageBox.error("Failed to navigate to dashboard. Please try refreshing the page.");
                    }
                }, 1000);
                
            } catch (err) {
                console.error("OTP verification failed:", err);
                
                // Show appropriate error message
                let userMessage = err.message;
                if (err.message.includes("Invalid") || err.message.includes("expired")) {
                    userMessage = "Invalid or expired OTP. Please try again or request a new OTP.";
                }
                
                MessageBox.error(userMessage);
                
                // Clear OTP field
                oModel.setProperty("/OTP", "");
                const oInput = this.byId("otpInput");
                if (oInput) {
                    oInput.setValue("");
                }
                
                // Disable verify button
                const oVerifyBtn = this.byId("verifyButton");
                if (oVerifyBtn) {
                    oVerifyBtn.setEnabled(false);
                }
                
            } finally {
                BusyIndicator.hide();
            }
        },
        
        _saveAuthState: function(employeeId, jwtToken, linkToken) {
            console.log("Saving auth state:", { employeeId, jwtToken, linkToken });
            
            // Save authentication state in component's view model
            const oAuthModel = this.getOwnerComponent().getModel("view");
            if (oAuthModel) {
                oAuthModel.setProperty("/employeeId", employeeId);
                oAuthModel.setProperty("/jwtToken", jwtToken);
                oAuthModel.setProperty("/authenticated", true);
                oAuthModel.setProperty("/linkToken", linkToken);
            }
            
            // Also save to session storage for persistence
            sessionStorage.setItem("employeeId", employeeId);
            if (jwtToken) {
                sessionStorage.setItem("jwtToken", jwtToken);
            }
            sessionStorage.setItem("authenticated", "true");
            sessionStorage.setItem("linkToken", linkToken);
            
            // Save to localStorage for longer persistence
            localStorage.setItem("employeeId", employeeId);
            if (jwtToken) {
                localStorage.setItem("jwtToken", jwtToken);
            }
            localStorage.setItem("authenticated", "true");
        },
        
        onResendOTP: function () {
            const oModel = this.getView().getModel("view");
            if (oModel.getProperty("/canResend")) {
                this._startAuthenticationFlow();
            }
        },
        
        _startResendTimer: function () {
            if (this._timer) {
                clearInterval(this._timer);
            }
            
            let timeLeft = 60;
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/timeRemaining", timeLeft);
            oModel.setProperty("/canResend", false);
            
            this._timer = setInterval(() => {
                timeLeft--;
                oModel.setProperty("/timeRemaining", timeLeft);
                
                if (timeLeft <= 0) {
                    clearInterval(this._timer);
                    this._timer = null;
                    oModel.setProperty("/canResend", true);
                }
            }, 1000);
        },
        
        _showError: function (msg) {
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/message", msg);
            oModel.setProperty("/messageType", "Error");
            MessageBox.error(msg);
        },
        
        _decodeJWT: function (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                console.log("JWT Payload:", payload);
                
                // Try different possible property names for employee ID
                return payload.employeeId || payload.empId || payload.employeeID || 
                       payload.sub || payload.id || payload.userId;
            } catch (e) {
                console.error("Failed to decode JWT:", e);
                return null;
            }
        },
        
        // Handle manual link token entry
        onLinkTokenChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/linkTokenInput", sValue.trim());
            
            // Also update the internal _linkToken variable
            if (sValue.trim() !== "") {
                this._linkToken = sValue.trim();
                oModel.setProperty("/linkToken", this._linkToken);
                oModel.setProperty("/encryptedId", this._linkToken);
                
                // Update URL with the new token
                this._oRouter.navTo("otp-verification-with-token", {
                    encryptedId: this._linkToken
                }, true);
            }
        },
        
        // Manual trigger for OTP generation
        onManualGenerateOTP: function () {
            const linkToken = this._getLinkToken();
            
            if (!linkToken || linkToken.trim() === "") {
                MessageBox.warning("Please enter a valid link token from your email.");
                return;
            }
            
            this._startAuthenticationFlow();
        },
        
        // Extract token from URL directly (fallback method)
        _extractTokenFromURL: function() {
            const hash = window.location.hash;
            console.log("Extracting from hash:", hash);
            
            // Pattern: #/OTPVerification/{token}
            const match = hash.match(/\/OTPVerification\/([a-f0-9]+)/i);
            if (match && match[1]) {
                const token = match[1];
                console.log("Extracted token from URL:", token);
                return token;
            }
            return null;
        },
        
        // Handle page refresh or direct access
        onAfterRendering: function() {
            // If page was loaded directly without route matching, try to get link token
            if (!this._linkToken) {
                const linkToken = this._getLinkToken();
                if (linkToken && linkToken.trim() !== "") {
                    console.log("Link token found after rendering:", linkToken);
                    // Start authentication flow
                    setTimeout(() => {
                        this._startAuthenticationFlow();
                    }, 500);
                }
            }
        }
    });
});



UPDATED CODE 2

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent"
], function (
    Controller,
    MessageToast,
    MessageBox,
    BusyIndicator,
    JSONModel,
    UIComponent
) {
    "use strict";
    
    return Controller.extend("employee.controller.OTPVerification", {
        onInit: function () {
            this._oRouter = UIComponent.getRouterFor(this);
            
            // Attach to route patterns
            this._oRouter.getRoute("otp-verification-with-token").attachPatternMatched(this._onRouteMatched, this);
            this._oRouter.getRoute("otp-verification").attachPatternMatched(this._onRouteMatched, this);
            
            this._timer = null;
            this._linkToken = null;
            
            // Initialize view model
            const oViewModel = new JSONModel({
                maskedEmail: "",
                OTP: "",
                message: "",
                messageType: "None",
                timeRemaining: 0,
                canResend: false,
                linkToken: "",
                linkTokenInput: "",
                encryptedId: "",
                employeeId: "" // Added employeeId to view model
            });
            this.getView().setModel(oViewModel, "view");
            
            // Also try to extract token immediately if page loaded directly
            this._checkDirectURLToken();
        },
        
        onExit: function () {
            if (this._timer) {
                clearInterval(this._timer);
                this._timer = null;
            }
        },
        
        _onRouteMatched: function (oEvent) {
            const args = oEvent.getParameter("arguments");
            const encryptedId = args ? args.encryptedId : null;

            if (!encryptedId || encryptedId.trim() === "") {
                // Use default encrypted ID if none provided
                const defaultId = "e4977ed8a797696718cb50430b1db736";
                this._linkToken = defaultId;
                
                // Update URL with default encrypted ID
                this._oRouter.navTo("otp-verification-with-token", {
                    encryptedId: defaultId
                }, true);
            } else {
                this._linkToken = encryptedId;
            }

            // Store globally
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/linkToken", this._linkToken);
            oViewModel.setProperty("/encryptedId", this._linkToken);

            console.log("Encrypted ID from URL:", this._linkToken);

            this._resetUI();
            this._startAuthenticationFlow();
        },

        _onEmptyRoute: function () {
            this._resetUI();
            MessageBox.information("Please use the verification link sent to your email.");
        },

        _resetUI: function () {
            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/maskedEmail", "");
            oViewModel.setProperty("/OTP", "");
            oViewModel.setProperty("/message", "");
            oViewModel.setProperty("/messageType", "None");
            oViewModel.setProperty("/timeRemaining", 0);
            oViewModel.setProperty("/canResend", false);
            oViewModel.setProperty("/employeeId", "");
        },
        
        _checkDirectURLToken: function() {
            // Also check direct URL hash in case routing didn't catch it
            const hash = window.location.hash;
            console.log("Current hash:", hash);
            
            // Try to extract token from URL pattern: #/OTPVerification/{token}
            const match = hash.match(/\/OTPVerification\/([a-f0-9]+)/i);
            if (match && match[1]) {
                const token = match[1];
                console.log("Direct URL token extraction:", token);
                
                // If we haven't already set the token, set it now
                if (!this._linkToken) {
                    this._linkToken = token;
                    const oModel = this.getView().getModel("view");
                    oModel.setProperty("/linkToken", this._linkToken);
                    oModel.setProperty("/encryptedId", this._linkToken);
                    oModel.setProperty("/linkTokenInput", this._linkToken);
                    
                    // Start authentication flow
                    setTimeout(() => {
                        this._startAuthenticationFlow();
                    }, 100);
                }
            }
        },
        
        _getLinkToken: function() {
            // First priority: internal variable
            if (this._linkToken) {
                return this._linkToken;
            }
            
            // Second priority: view model
            const oModel = this.getView().getModel("view");
            const viewModelToken = oModel.getProperty("/linkToken");
            if (viewModelToken && viewModelToken.trim() !== "") {
                this._linkToken = viewModelToken;
                return this._linkToken;
            }
            
            // Third priority: input field
            const inputToken = oModel.getProperty("/linkTokenInput");
            if (inputToken && inputToken.trim() !== "") {
                this._linkToken = inputToken;
                return this._linkToken;
            }
            
            // Fourth priority: direct URL extraction
            const directToken = this._extractTokenFromURL();
            if (directToken) {
                this._linkToken = directToken;
                oModel.setProperty("/linkToken", this._linkToken);
                oModel.setProperty("/encryptedId", this._linkToken);
                oModel.setProperty("/linkTokenInput", this._linkToken);
                return this._linkToken;
            }
            
            // Fallback to default encrypted ID
            const defaultId = "e4977ed8a797696718cb50430b1db736";
            this._linkToken = defaultId;
            oModel.setProperty("/linkToken", this._linkToken);
            oModel.setProperty("/encryptedId", this._linkToken);
            return this._linkToken;
        },
        
        async _startAuthenticationFlow() {
            const linkToken = this._getLinkToken();
            
            if (!linkToken || linkToken.trim() === "") {
                MessageBox.warning("No verification token provided. Please use the link from your email or enter the token manually.");
                return;
            }
            
            console.log("Starting authentication flow with link token:", linkToken);
            
            BusyIndicator.show(0);
            
            try {
                const response = await fetch("/odata/v4/authentication/generateOTP", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ linkToken })
                });
                
                let data = {};
                const contentType = response.headers.get("content-type");
                
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                }
                
                if (!response.ok) {
                    const errorMsg = data.message || data.error?.message || "Invalid or expired verification link.";
                    throw new Error(errorMsg);
                }
                
                console.log("OTP generated successfully:", data);
                
                const oModel = this.getView().getModel("view");
                
                // Store employee ID if available
                if (data.employeeId) {
                    oModel.setProperty("/employeeId", data.employeeId);
                    console.log("Employee ID from OTP response:", data.employeeId);
                }
                
                oModel.setProperty(
                    "/maskedEmail",
                    data.maskedEmail || data.email || "your registered email"
                );
                
                // MessageToast.show("OTP sent successfully");
                
                // Clear any previous error message
                oModel.setProperty("/message", "");
                oModel.setProperty("/messageType", "None");
                
                this._startResendTimer();
                
            } catch (err) {
                console.error("Authentication flow failed:", err);
                this._showError(err.message);
            } finally {
                BusyIndicator.hide();
            }
        },
        
        onOTPChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const sDigits = sValue.replace(/\D/g, "").substring(0, 6);
            
            oEvent.getSource().setValue(sDigits);
            
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/OTP", sDigits);
            
            // Enable Verify button only when 6 digits entered
            const oVerifyBtn = this.byId("verifyButton");
            if (oVerifyBtn) {
                oVerifyBtn.setEnabled(sDigits.length === 6);
            }
        },
        
        async onVerifyOTP() {
            const oModel = this.getView().getModel("view");
            const sOTP = oModel.getProperty("/OTP");
            const linkToken = this._getLinkToken();
            
            if (!sOTP || sOTP.length !== 6) {
                MessageBox.error("Please enter a valid 6-digit OTP.");
                return;
            }
            
            if (!linkToken) {
                MessageBox.error("Verification token missing.");
                return;
            }
            
            BusyIndicator.show(0);
            
            try {
                console.log("Verifying OTP:", sOTP, "with token:", linkToken);
                
                const verifyResponse = await fetch("/odata/v4/authentication/verifyOTP", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        linkToken: linkToken,
                        otp: sOTP
                    })
                });
                
                let verifyData = {};
                const contentType = verifyResponse.headers.get("content-type");
                
                // ✅ SAFE JSON parsing
                if (contentType && contentType.includes("application/json")) {
                    verifyData = await verifyResponse.json();
                }
                
                if (!verifyResponse.ok) {
                    const errorMsg = verifyData.message || verifyData.error?.message || "Invalid or expired OTP. Please try again.";
                    throw new Error(errorMsg);
                }
                
                console.log("OTP verified successfully:", verifyData);
                
                // ✅ Determine employeeId - multiple fallback options
                let employeeId = null;
                
                // Try different sources for employee ID
                if (verifyData.employeeId) {
                    employeeId = verifyData.employeeId;
                } else if (verifyData.employeeID) {
                    employeeId = verifyData.employeeID;
                } else if (verifyData.empId) {
                    employeeId = verifyData.empId;
                } else if (verifyData.employee && verifyData.employee.employeeID) {
                    employeeId = verifyData.employee.employeeID;
                } else if (verifyData.employee && verifyData.employee.id) {
                    employeeId = verifyData.employee.id;
                } else if (verifyData.id) {
                    employeeId = verifyData.id;
                } else {
                    // Try to get from view model (from OTP generation response)
                    employeeId = oModel.getProperty("/employeeId");
                }
                
                console.log("Employee ID determined:", employeeId);
                
                // If still no employeeId, try to get from session storage
                if (!employeeId) {
                    employeeId = sessionStorage.getItem("employeeId");
                    console.log("Employee ID from session storage:", employeeId);
                }
                
                // ✅ Generate JWT token if endpoint exists
                let jwtToken = null;
                try {
                    const jwtResponse = await fetch("/odata/v4/authentication/generateJWT", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            linkToken: linkToken,
                            employeeId: employeeId
                        })
                    });
                    
                    if (jwtResponse.ok) {
                        const jwtContentType = jwtResponse.headers.get("content-type");
                        if (jwtContentType && jwtContentType.includes("application/json")) {
                            const jwtData = await jwtResponse.json();
                            jwtToken = jwtData.token || jwtData.jwtToken;
                            console.log("JWT generated:", jwtToken);
                        }
                    } else {
                        console.log("JWT endpoint not available or failed, continuing without JWT");
                    }
                } catch (jwtError) {
                    console.log("JWT generation skipped:", jwtError.message);
                    // Continue without JWT - it might not be required
                }
                
                // ✅ Save auth state
                this._saveAuthState(employeeId, jwtToken, linkToken);
                
                // Clear OTP field
                oModel.setProperty("/OTP", "");
                const oInput = this.byId("otpInput");
                if (oInput) {
                    oInput.setValue("");
                }
                
                // Show success message
                MessageToast.show("OTP verified successfully! Redirecting to dashboard...");
                
                // ✅ Navigate to employee dashboard
                // First, check if we have a valid employeeId
                if (!employeeId || employeeId.trim() === "") {
                    // If no employeeId, use a default or show error
                    MessageBox.error("Could not determine employee information. Please contact support.");
                    return;
                }
                
                // Clear timer if running
                if (this._timer) {
                    clearInterval(this._timer);
                    this._timer = null;
                }
                
                // Navigate after a short delay for better UX
                setTimeout(() => {
                    try {
                        console.log("Navigating to employee dashboard with ID:", employeeId);
                        this._oRouter.navTo("employee", { 
                            employeeId: employeeId 
                        }, true);
                    } catch (navError) {
                        console.error("Navigation failed:", navError);
                        MessageBox.error("Failed to navigate to dashboard. Please try refreshing the page.");
                    }
                }, 1000);
                
            } catch (err) {
                console.error("OTP verification failed:", err);
                
                // Show appropriate error message
                let userMessage = err.message;
                if (err.message.includes("Invalid") || err.message.includes("expired")) {
                    userMessage = "Invalid or expired OTP. Please try again or request a new OTP.";
                }
                
                MessageBox.error(userMessage);
                
                // Clear OTP field
                oModel.setProperty("/OTP", "");
                const oInput = this.byId("otpInput");
                if (oInput) {
                    oInput.setValue("");
                }
                
                // Disable verify button
                const oVerifyBtn = this.byId("verifyButton");
                if (oVerifyBtn) {
                    oVerifyBtn.setEnabled(false);
                }
                
            } finally {
                BusyIndicator.hide();
            }
        },
        
        _saveAuthState: function(employeeId, jwtToken, linkToken) {
            console.log("Saving auth state:", { employeeId, jwtToken, linkToken });
            
            // Save authentication state in component's view model
            const oAuthModel = this.getOwnerComponent().getModel("view");
            if (oAuthModel) {
                oAuthModel.setProperty("/employeeId", employeeId);
                oAuthModel.setProperty("/jwtToken", jwtToken);
                oAuthModel.setProperty("/authenticated", true);
                oAuthModel.setProperty("/linkToken", linkToken);
            }
            
            // Also save to session storage for persistence
            sessionStorage.setItem("employeeId", employeeId);
            if (jwtToken) {
                sessionStorage.setItem("jwtToken", jwtToken);
            }
            sessionStorage.setItem("authenticated", "true");
            sessionStorage.setItem("linkToken", linkToken);
            
            // Save to localStorage for longer persistence
            localStorage.setItem("employeeId", employeeId);
            if (jwtToken) {
                localStorage.setItem("jwtToken", jwtToken);
            }
            localStorage.setItem("authenticated", "true");
        },
        
        onResendOTP: function () {
            const oModel = this.getView().getModel("view");
            if (oModel.getProperty("/canResend")) {
                this._startAuthenticationFlow();
            }
        },
        
        _startResendTimer: function () {
            if (this._timer) {
                clearInterval(this._timer);
            }
            
            let timeLeft = 60;
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/timeRemaining", timeLeft);
            oModel.setProperty("/canResend", false);
            
            this._timer = setInterval(() => {
                timeLeft--;
                oModel.setProperty("/timeRemaining", timeLeft);
                
                if (timeLeft <= 0) {
                    clearInterval(this._timer);
                    this._timer = null;
                    oModel.setProperty("/canResend", true);
                }
            }, 1000);
        },
        
        _showError: function (msg) {
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/message", msg);
            oModel.setProperty("/messageType", "Error");
            MessageBox.error(msg);
        },
        
        _decodeJWT: function (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                console.log("JWT Payload:", payload);
                
                // Try different possible property names for employee ID
                return payload.employeeId || payload.empId || payload.employeeID || 
                       payload.sub || payload.id || payload.userId;
            } catch (e) {
                console.error("Failed to decode JWT:", e);
                return null;
            }
        },
        
        // Handle manual link token entry
        onLinkTokenChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oModel = this.getView().getModel("view");
            oModel.setProperty("/linkTokenInput", sValue.trim());
            
            // Also update the internal _linkToken variable
            if (sValue.trim() !== "") {
                this._linkToken = sValue.trim();
                oModel.setProperty("/linkToken", this._linkToken);
                oModel.setProperty("/encryptedId", this._linkToken);
                
                // Update URL with the new token
                this._oRouter.navTo("otp-verification-with-token", {
                    encryptedId: this._linkToken
                }, true);
            }
        },
        
        // Manual trigger for OTP generation
        onManualGenerateOTP: function () {
            const linkToken = this._getLinkToken();
            
            if (!linkToken || linkToken.trim() === "") {
                MessageBox.warning("Please enter a valid link token from your email.");
                return;
            }
            
            this._startAuthenticationFlow();
        },
        
        // Extract token from URL directly (fallback method)
        _extractTokenFromURL: function() {
            const hash = window.location.hash;
            console.log("Extracting from hash:", hash);
            
            // Pattern: #/OTPVerification/{token}
            const match = hash.match(/\/OTPVerification\/([a-f0-9]+)/i);
            if (match && match[1]) {
                const token = match[1];
                console.log("Extracted token from URL:", token);
                return token;
            }
            return null;
        },
        
        // Handle page refresh or direct access
        onAfterRendering: function() {
            // If page was loaded directly without route matching, try to get link token
            if (!this._linkToken) {
                const linkToken = this._getLinkToken();
                if (linkToken && linkToken.trim() !== "") {
                    console.log("Link token found after rendering:", linkToken);
                    // Start authentication flow
                    setTimeout(() => {
                        this._startAuthenticationFlow();
                    }, 500);
                }
            }
        }
    });
});





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
