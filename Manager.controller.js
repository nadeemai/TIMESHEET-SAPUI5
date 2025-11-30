sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/StandardListItem",
    "sap/m/List",
    "sap/m/Slider",
    "sap/m/MultiComboBox",
    "sap/m/ProgressIndicator",
    "sap/m/ObjectNumber",
    "sap/m/ObjectStatus",
    "sap/m/DatePicker",
    "sap/m/GenericTile",
    "sap/m/TileContent",
    "sap/m/NumericContent",
    "sap/m/Panel",
    "sap/m/Toolbar",
    "sap/m/Title",
    "sap/m/ToolbarSpacer",
    "sap/m/SearchField",
    "sap/ui/table/Column",
    "sap/ui/table/Table",
    "sap/viz/ui5/controls/VizFrame",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/data/DimensionDefinition",
    "sap/viz/ui5/data/MeasureDefinition",
    "sap/m/IconTabFilter",
    "sap/m/HBox",
    "sap/m/Image",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], function(Controller, JSONModel, MessageToast, Dialog, Button, Text, VBox, Input, Label, Select, Item, Filter, FilterOperator, Fragment, StandardListItem, List, Slider, MultiComboBox, ProgressIndicator, ObjectNumber, ObjectStatus, DatePicker, GenericTile, TileContent, NumericContent, Panel, Toolbar, Title, ToolbarSpacer, SearchField, Column, Table, VizFrame, FlattenedDataset, DimensionDefinition, MeasureDefinition, IconTabFilter, HBox, Image, MessageBox, BusyIndicator) {
    "use strict";

    return Controller.extend("manager.controller.Manager", {

        onInit: function() {
            // MAIN VIEW MODEL INITIALIZATION
            const oVM = new JSONModel({
                users: [], // employee list
                selectedEmployee: "", // selected emp ID
                selectedEmployeeName: "", // selected emp name
                currentWeekStart: this._getMonday(new Date()), // start of this week
                timesheetEntries: [], // table rows
                totalWeekHours: 0, // weekly total
                hasNoTimesheetData: false, // default
                selectedDate: this._formatDateForDatePicker(this._getMonday(new Date())),
                weekDays: []
            });
            this.getView().setModel(oVM);

            // Initialize week days
            this._updateWeekDays(oVM.getProperty("/currentWeekStart"));

            // NOW LOAD EMPLOYEES
            this._loadEmployees();
            // NOW LOAD PROJECT
            this._loadProjectsData();
        },

        _getMonday: function(d) {
            d = new Date(d);
            let day = d.getDay(),
                diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
            return new Date(d.setDate(diff));
        },

        _getWeekStart: function(date) {
            var d = new Date(date);
            var day = d.getDay();
            var diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            return new Date(d.setDate(diff));
        },

        _getWeekEnd: function(weekStart) {
            let end = new Date(weekStart);
            end.setDate(end.getDate() + 6);
            return end;
        },

        _formatDateForOData: function(date) {
            if (!date) return "";
            return "/Date(" + date.getTime() + ")/";
        },

        _formatDateForDatePicker: function(oDate) {
            if (!oDate) return "";
            let year = oDate.getFullYear();
            let month = String(oDate.getMonth() + 1).padStart(2, '0');
            let day = String(oDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        _formatDay: function(date) {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        },

        _updateWeekDays: function(weekStart) {
            let oModel = this.getView().getModel();
            let start = new Date(weekStart);
            let days = [];
            for (let i = 0; i < 7; i++) {
                let d = new Date(start);
                d.setDate(d.getDate() + i);
                days.push(this._formatDay(d));
            }
            oModel.setProperty("/weekDays", days);
        },

        onDatePickerChange: function(oEvent) {
            BusyIndicator.show(0);
            let oDatePicker = oEvent.getSource();
            let dateValue = oDatePicker.getDateValue();

            if (!dateValue || isNaN(dateValue.getTime())) {
                BusyIndicator.hide();
                return;
            }

            let oModel = this.getView().getModel();
            // Calculate Monday (start of week)
            let weekStart = this._getWeekStart(dateValue);
            
            // Save weekStart in model
            oModel.setProperty("/currentWeekStart", weekStart);
            
            // Update week days label UI
            this._updateWeekDays(weekStart);
            
            // Compute week end
            let weekEnd = this._getWeekEnd(weekStart);
            
            console.log("DatePicker changed:", {
                selectedDate: dateValue,
                weekStart: weekStart,
                weekEnd: weekEnd
            });

            // Load time entries for the selected employee
            let employeeId = oModel.getProperty("/selectedEmployee");
            if (employeeId) {
                this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
            } else {
                MessageToast.show("Please select an employee first");
            }
            BusyIndicator.hide();
        },

        onProfilePress: function() {
            const oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            const oView = this.getView();
            if (!oDataModel) {
                MessageBox.error("OData model not found.");
                return;
            }
            BusyIndicator.show(0);
            oDataModel.read("/MyManagerProfile", {
                success: (oData) => {
                    BusyIndicator.hide();
                    if (!oData?.results?.length) {
                        MessageBox.warning("No profile data found.");
                        return;
                    }
                    const p = oData.results[0];
                    const oProfileModel = new JSONModel({
                        profile: {
                            employeeID: p.employeeID || "",
                            firstName: p.firstName || "",
                            lastName: p.lastName || "",
                            email: p.email || "",
                            managerName: p.managerName || "",
                            managerEmail: p.managerEmail || "",
                            activeStatus: p.isActive ? "Yes" : "No",
                            changedBy: p.modifiedBy || "",
                            userRole: p.roleName || ""
                        }
                    });
                    if (!this._oProfileDialog) {
                        this._oProfileDialog = sap.ui.xmlfragment(
                            this.createId("profileDialogFrag"),
                            "manager.Fragments.ProfileDialog",
                            this
                        );
                        oView.addDependent(this._oProfileDialog);
                    }
                    this._oProfileDialog.setModel(oProfileModel, "view");
                    this._oProfileDialog.open();
                },
                error: (oError) => {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to load profile data.");
                    console.error(oError);
                }
            });
        },

        onCloseProfileDialog: function() {
            if (this._oProfileDialog) {
                this._oProfileDialog.close();
            }
        },

        _loadAdminTimesheetData: function(employeeId, weekStart, weekEnd) {
            const oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            const oVM = this.getView().getModel();
            const that = this;
            BusyIndicator.show(0);
            
            const normalize = date => date ? new Date(date).toISOString().split("T")[0] : "";
            const start = normalize(weekStart);
            const end = normalize(weekEnd);

            // Build filters
            const filters = [
                new Filter("employeeEmpID", FilterOperator.EQ, employeeId),
                new Filter("weekStartDate", FilterOperator.LE, start),
                new Filter("weekEndDate", FilterOperator.GE, end)
            ];

            oModel.read("/TeamTimesheets", {
                filters,
                success: function(oData) {
                    const rows = oData.results || [];
                    const valid = rows.filter(r =>
                        r.employeeEmpID === employeeId &&
                        normalize(r.weekStartDate) <= end &&
                        normalize(r.weekEndDate) >= start
                    );
                    console.log("Filtered Timesheet:", valid);
                    const formatted = that._formatAdminTimesheet(valid);
                    oVM.setProperty("/timesheetEntries", formatted);
                    const total = formatted.reduce((s, x) => s + x.totalHours, 0);
                    oVM.setProperty("/totalWeekHours", total);
                    BusyIndicator.hide();
                },
                error: function() {
                    BusyIndicator.hide();
                    MessageToast.show("Error loading timesheet.");
                    oVM.setProperty("/timesheetEntries", []);
                }
            });
        },

        _formatAdminTimesheet: function(entries) {
            const num = v => Number(v || 0);
            return entries.map(item => {
                const projectName = item.projectName?.trim() !== "" ?
                    item.projectName :
                    item.nonProjectTypeName || "Non-Project";
                return {
                    project: projectName,
                    task: item.task || "",
                    taskDetails: item.taskDetails || "",
                    monday: num(item.mondayHours),
                    tuesday: num(item.tuesdayHours),
                    wednesday: num(item.wednesdayHours),
                    thursday: num(item.thursdayHours),
                    friday: num(item.fridayHours),
                    saturday: num(item.saturdayHours),
                    sunday: num(item.sundayHours),
                    mondayTaskDetails: item.mondayTaskDetails || "",
                    tuesdayTaskDetails: item.tuesdayTaskDetails || "",
                    wednesdayTaskDetails: item.wednesdayTaskDetails || "",
                    thursdayTaskDetails: item.thursdayTaskDetails || "",
                    fridayTaskDetails: item.fridayTaskDetails || "",
                    saturdayTaskDetails: item.saturdayTaskDetails || "",
                    sundayTaskDetails: item.sundayTaskDetails || "",
                    totalHours:
                        num(item.mondayHours) +
                        num(item.tuesdayHours) +
                        num(item.wednesdayHours) +
                        num(item.thursdayHours) +
                        num(item.fridayHours) +
                        num(item.saturdayHours) +
                        num(item.sundayHours)
                };
            });
        },

        _loadEmployees: function() {
            const oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            const that = this;
            const oVM = this.getView().getModel();
            BusyIndicator.show(0);
            oModel.read("/AllEmployees", {
                success: function(oData) {
                    const list = oData.value || oData.results || [];
                    // Normalize employees
                    const users = that._formatEmployeeData(list);
                    // Only employees
                    const allowed = ["Employee"];
                    const filtered = users.filter(u => allowed.includes(u.roleName));
                    oVM.setProperty("/users", filtered);
                    
                    // Load timesheet data for ALL employees
                    that._markEmployeesWithTimesheetStatus(filtered);
                    BusyIndicator.hide();
                },
                error: function() {
                    BusyIndicator.hide();
                    MessageToast.show("Failed to load employees.");
                }
            });
        },

        _markEmployeesWithTimesheetStatus: function(employees) {
            const oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            const oVM = this.getView().getModel();
            const that = this;
            const weekStart = oVM.getProperty("/currentWeekStart");
            const weekEnd = this._getWeekEnd(weekStart);
            const normalize = d => d ? new Date(d).toISOString().split("T")[0] : "";
            const start = normalize(weekStart);
            const end = normalize(weekEnd);

            oModel.read("/TeamTimesheets", {
                success: function(oData) {
                    const rows = oData.results || [];
                    const valid = rows.filter(r =>
                        normalize(r.weekStartDate) <= end &&
                        normalize(r.weekEndDate) >= start
                    );
                    // Match Timesheet.employee_ID with Employee.backendId
                    const employeesWithEntries = new Set(valid.map(r => r.employee_ID));
                    employees.forEach(emp => {
                        emp.hasNoTimesheetData = !employeesWithEntries.has(emp.backendId);
                    });
                    oVM.setProperty("/users", employees);
                    oVM.refresh(true);
                },
                error: function() {
                    // If error, mark all as having no data
                    employees.forEach(emp => {
                        emp.hasNoTimesheetData = true;
                    });
                    oVM.setProperty("/users", employees);
                }
            });
        },

        _formatEmployeeData: function(aEmployees) {
            // First pass: Normalize all user records
            let aFormattedUsers = aEmployees.map(function(employee) {
                // ROLE MAPPING
                let role =
                    employee.roleName ||
                    employee.Role ||
                    employee.role ||
                    employee.accessLevel ||
                    "Employee";
                // Normalize role text
                role = role.toLowerCase().includes("admin") ?
                    "Admin" :
                    role.toLowerCase().includes("manager") ?
                    "Manager" :
                    "Employee";

                return {
                    // IDs
                    userId: employee.employeeID || employee.EmployeeID || employee.ID,
                    backendId: employee.ID || employee.id || "",
                    // Basic Info
                    firstName: employee.firstName || employee.FirstName || "",
                    lastName: employee.lastName || employee.LastName || "",
                    email: employee.email || employee.Email || "",
                    // Role
                    role: role,
                    roleName: role,
                    // Manager Relations
                    managerId: employee.managerID_ID || employee.ManagerID || employee.managerId || "",
                    managerName: employee.managerName || employee.ManagerName || "",
                    // Status
                    status: employee.isActive ? "Active" : "Inactive"
                };
            });

            // SECOND PASS: FIX MANAGER NAMES
            aFormattedUsers.forEach(function(user) {
                if (user.managerId) {
                    const mgr = aFormattedUsers.find(m => m.userId === user.managerId);
                    if (mgr) {
                        user.managerName = mgr.firstName + " " + mgr.lastName;
                    } else if (!user.managerName) {
                        user.managerName = "Unknown Manager";
                    }
                } else {
                    user.managerName = ""; // No manager
                }
            });

            return aFormattedUsers;
        },

        onEmployeeListSelect: function(oEvent) {
            const oItem = oEvent.getParameter("listItem");
            const oCtx = oItem.getBindingContext(); // Main model context
            if (!oCtx) {
                console.warn("No binding context found for employee list item.");
                return;
            }
            const employeeId = oCtx.getProperty("userId");
            const first = oCtx.getProperty("firstName") || "";
            const last = oCtx.getProperty("lastName") || "";
            const employeeName = first + " " + last;
            const oVM = this.getView().getModel();
            
            // Update selected user
            oVM.setProperty("/selectedEmployee", employeeId);
            oVM.setProperty("/selectedEmployeeName", employeeName);
            
            // Save selection
            localStorage.setItem("selectedEmployeeId", employeeId);
            
            // Load week time entries for selected employee
            const weekStart = oVM.getProperty("/currentWeekStart");
            const weekEnd = this._getWeekEnd(weekStart);
            this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
        },

        onSearchEmployee: function(oEvent) {
            const sQuery = oEvent.getParameter("newValue")?.toLowerCase() || "";
            const oList = this.byId("employeeList");
            const oBinding = oList.getBinding("items");
            if (!oBinding) return;
            
            // Multi-field filter (firstName + lastName)
            const oFilter = new Filter({
                filters: [
                    new Filter("firstName", FilterOperator.Contains, sQuery),
                    new Filter("lastName", FilterOperator.Contains, sQuery)
                ],
                and: false // OR logic — match either
            });
            if (sQuery) {
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]); // reset filter
            }
        },

        // New function to load projects data
        _loadProjectsData: function() {
            const oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            const oViewModel = this.getView().getModel();
            
            if (!oModel) {
                MessageBox.error("OData model not found.");
                return;
            }
            
            BusyIndicator.show(0);
            
            oModel.read("/MyProjects", {
                success: (oData) => {
                    BusyIndicator.hide();
                    
                    const projectsData = oData.results || [];
                    oViewModel.setProperty("/projectsData", projectsData);
                    
                    // Update project summary with actual data
                    // this._updateProjectSummary(projectsData);
                },
                error: (oError) => {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to load projects data.");
                    console.error(oError);
                }
            });
        },
        
        // New function to update project summary
        // _updateProjectSummary: function(projectsData) {
        //     const oReportModel = this.getView().getModel("projectReport") || new JSONModel();
            
        //     if (!this.getView().getModel("projectReport")) {
        //         this.getView().setModel(oReportModel, "projectReport");
        //     }
            
        //     // Calculate total hours, employee count, etc.
        //     let totalHours = 0;
        //     let employeeCount = 0;
            
        //     projectsData.forEach(project => {
        //         totalHours += project.allocatedHours || 0;
        //         // You might need to adjust this based on your actual data structure
        //         // For now, we'll use a placeholder for employee count
        //         employeeCount += 1; // This should be replaced with actual employee count per project
        //     });
            
        //     const avgHoursPerEmployee = employeeCount > 0 ? (totalHours / employeeCount).toFixed(2) : 0;
            
        //     oReportModel.setProperty("/totalHours", totalHours);
        //     oReportModel.setProperty("/employeeCount", employeeCount);
        //     oReportModel.setProperty("/avgHoursPerEmployee", avgHoursPerEmployee);
        // },
        
        // New formatter for project status
        formatProjectStatusState: function(sStatus) {
            if (!sStatus) return "None";
            
            switch (sStatus.toLowerCase()) {
                case "active":
                case "in progress":
                    return "Success";
                case "completed":
                    return "Information";
                case "on hold":
                case "pending":
                    return "Warning";
                case "cancelled":
                case "closed":
                    return "Error";
                default:
                    return "None";
            }
        },
        
        // Update onGenerateReport to refresh projects data
        onGenerateReport: function() {
            this._loadProjectsData();
            // ... existing code ...
            MessageToast.show("Project report generated");
        },

        onPreviousWeek: function() {
            let oModel = this.getView().getModel();
            let oDatePicker = this.getView().byId("datePicker");
            
            // Get current week start
            let currentWeekStart = new Date(oModel.getProperty("/currentWeekStart"));
            if (isNaN(currentWeekStart)) {
                console.error("Invalid week start:", oModel.getProperty("/currentWeekStart"));
                return;
            }
            
            // Move week start back by 7 days
            currentWeekStart.setDate(currentWeekStart.getDate() - 7);
            
            // Save the updated week start
            oModel.setProperty("/currentWeekStart", currentWeekStart);
            
            // Update the selectedDate in the DatePicker to match the week start
            oModel.setProperty("/selectedDate", this._formatDateForDatePicker(currentWeekStart));
            
            // Explicitly set the date picker value to ensure UI update
            if (oDatePicker) {
                oDatePicker.setDateValue(currentWeekStart);
            }
            
            // Compute clean weekStart & weekEnd
            let weekStart = new Date(currentWeekStart);
            let weekEnd = this._getWeekEnd(weekStart);
            
            // Update week days UI
            this._updateWeekDays(weekStart);
            
            // Load Timesheet Records for this week
            let employeeId = oModel.getProperty("/selectedEmployee");
            if (employeeId) {
                this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
            }
        },

        onCurrentWeek: function() {
            let oModel = this.getView().getModel();
            let oDatePicker = this.getView().byId("datePicker");
            let weekStart = this._getWeekStart(new Date());
            
            oModel.setProperty("/currentWeekStart", weekStart);
            
            // Update the selectedDate in the DatePicker to match the current week
            oModel.setProperty("/selectedDate", this._formatDateForDatePicker(weekStart));
            
            // Explicitly set the date picker value to ensure UI update
            if (oDatePicker) {
                oDatePicker.setDateValue(weekStart);
            }
            
            let weekEnd = this._getWeekEnd(weekStart);
            this._updateWeekDays(weekStart);
            
            let employeeId = oModel.getProperty("/selectedEmployee");
            if (employeeId) {
                this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
            }
        },

        onNextWeek: function() {
            let oModel = this.getView().getModel();
            let oDatePicker = this.getView().byId("datePicker");
            
            // Get current week start
            let currentWeekStart = new Date(oModel.getProperty("/currentWeekStart"));
            if (isNaN(currentWeekStart)) {
                console.error("Invalid week start:", oModel.getProperty("/currentWeekStart"));
                return;
            }
            
            // Move week start forward by 7 days
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            
            // Save the updated week start
            oModel.setProperty("/currentWeekStart", currentWeekStart);
            
            // Update the selectedDate in the DatePicker to match the week start
            oModel.setProperty("/selectedDate", this._formatDateForDatePicker(currentWeekStart));
            
            // Explicitly set the date picker value to ensure UI update
            if (oDatePicker) {
                oDatePicker.setDateValue(currentWeekStart);
            }
            
            // Compute clean weekStart & weekEnd
            let weekStart = new Date(currentWeekStart);
            let weekEnd = this._getWeekEnd(weekStart);
            
            // Update week days UI
            this._updateWeekDays(weekStart);
            
            let employeeId = oModel.getProperty("/selectedEmployee");
            if (employeeId) {
                this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
            }
        },

        onTaskDetailPress: function(oEvent) {
            try {
                var oButton = oEvent.getSource();
                var oBindingContext = oButton.getBindingContext();
                if (!oBindingContext) {
                    MessageToast.show("Unable to get binding context");
                    return;
                }
                var oEntry = oBindingContext.getObject();
                var oModel = this.getView().getModel();
                var oWeekDates = this._getWeekDates(); // Get week dates from model
                if (!oWeekDates) {
                    MessageToast.show("Week dates not available");
                    return;
                }

                // Ensure dailyComments exists
                oEntry.dailyComments = oEntry.dailyComments || {};
                var that = this; // if needed inside controller
                var aDays = [{
                        name: "Monday",
                        hours: oEntry.monday || 0,
                        comment: oEntry.mondayTaskDetails || "No task details",
                        date: that._formatDateForDisplay(oWeekDates.monday)
                    },
                    {
                        name: "Tuesday",
                        hours: oEntry.tuesday || 0,
                        comment: oEntry.tuesdayTaskDetails || "No task details",
                        date: that._formatDateForDisplay(oWeekDates.tuesday)
                    },
                    {
                        name: "Wednesday",
                        hours: oEntry.wednesday || 0,
                        comment: oEntry.wednesdayTaskDetails || "No task details",
                        date: that._formatDateForDisplay(oWeekDates.wednesday)
                    },
                    {
                        name: "Thursday",
                        hours: oEntry.thursday || 0,
                        comment: oEntry.thursdayTaskDetails || "No task details",
                        date: that._formatDateForDisplay(oWeekDates.thursday)
                    },
                    {
                        name: "Friday",
                        hours: oEntry.friday || 0,
                        comment: oEntry.fridayTaskDetails || "No task details",
                        date: that._formatDateForDisplay(oWeekDates.friday)
                    },
                    {
                        name: "Saturday",
                        hours: oEntry.saturday || 0,
                        comment: oEntry.saturdayTaskDetails || "No task details",
                        date: that._formatDateForDisplay(oWeekDates.saturday)
                    },
                    {
                        name: "Sunday",
                        hours: oEntry.sunday || 0,
                        comment: oEntry.sundayTaskDetails || "No task details",
                        date: that._formatDateForDisplay(oWeekDates.sunday)
                    }
                ];

                var getHoursColorClass = function(hours) {
                    if (hours === 0) {
                        return "tsHoursRed"; // red
                    } else if (hours > 0 && hours < 8) {
                        return "tsHoursOrange"; // orange
                    } else if (hours >= 8 && hours <= 15) {
                        return "tsHoursGreen"; // green
                    }
                    return ""; // default no class
                };

                var aItems = aDays.map(function(oDay, index) {
                    return new VBox({
                        width: "100%",
                        items: [
                            new HBox({
                                justifyContent: "SpaceBetween",
                                items: [
                                    new Text({
                                        text: `${oDay.name} (${oDay.date})`,
                                        design: "Bold"
                                    }),
                                    new Text({
                                        text: `${oDay.hours.toFixed(2)} hrs`,
                                        design: "Bold"
                                    }).addStyleClass(getHoursColorClass(oDay.hours))
                                ]
                            }).addStyleClass("tsDayHeader"),
                            new Text({
                                text: oDay.comment,
                                wrapping: true
                            }).addStyleClass("tsDayComment"),
                            ...(index < aDays.length - 1 ? [
                                new HBox({
                                    height: "1px",
                                    class: "tsSeparator"
                                })
                            ] : [])
                        ]
                    }).addStyleClass("tsDayCard");
                });

                // Create a dialog with a custom style class to match the image
                var oDialog = new Dialog({
                    title: "Week Task Details",
                    contentWidth: "320px", // adjusted width to match image
                    contentHeight: "70vh", // max height of dialog
                    stretchOnPhone: true,
                    content: new VBox({
                        items: aItems,
                        class: "sapUiResponsiveMargin"
                    }),
                    endButton: new Button({
                        text: "Close",
                        press: function() {
                            oDialog.close();
                        }
                    }),
                    afterClose: function() {
                        oDialog.destroy();
                    }
                });

                // Add custom CSS styles to match the image exactly
                var sCustomCSS = `
                    .tsDayCard {
                        margin-bottom: 12px;
                        padding: 12px;
                        border-radius: 6px;
                        background-color: #f8f9fa;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    
                    .tsDayHeader {
                        margin-bottom: 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .tsDayComment {
                        margin-top: 8px;
                        color: #555;
                        font-size: 14px;
                        line-height: 1.4;
                    }
                    
                    .tsSeparator {
                        margin: 12px 0;
                        background-color: #e0e0e0;
                        width: 100%;
                    }
                    
                    .tsHoursRed {
                        color: #e74c3c;
                        font-weight: bold;
                    }
                    
                    .tsHoursOrange {
                        color: #f39c12;
                        font-weight: bold;
                    }
                    
                    .tsHoursGreen {
                        color: #27ae60;
                        font-weight: bold;
                    }
                `;

                // Create a style element and append it to the head if it doesn't exist
                if (!document.getElementById('taskDetailStyles')) {
                    var oStyle = document.createElement('style');
                    oStyle.id = 'taskDetailStyles';
                    oStyle.innerHTML = sCustomCSS;
                    document.head.appendChild(oStyle);
                }

                this.getView().addDependent(oDialog);
                oDialog.open();
            } catch (oError) {
                console.error("Error in onTaskDetailPress:", oError);
            }
        },

        onHourButtonPress: function(oEvent) {
            try {
                var oButton = oEvent.getSource();
                var oBindingContext = oButton.getBindingContext();
                if (!oBindingContext) {
                    MessageToast.show("Unable to get binding context");
                    return;
                }
                var oEntry = oBindingContext.getObject();
                var oModel = this.getView().getModel();
                var aWeekDays = oModel.getProperty("/weekDays") || [];

                // Get the day from the button's custom data
                var sDay = oButton.data("day");
                if (!sDay) {
                    // Try to extract day from binding path or other source
                    var sBindingPath = oButton.getBindingPath("text");
                    if (sBindingPath) {
                        sDay = sBindingPath.toLowerCase();
                    } else {
                        MessageToast.show("Unable to determine day");
                        return;
                    }
                }

                // Get the date for the specific day
                var iDayIndex = this._getDayIndex(sDay);
                var sDate = aWeekDays[iDayIndex] || this._getDefaultDate(iDayIndex);

                // Get current hours for the day
                var fCurrentHours = oEntry[sDay] || 0;

                // Get week dates for proper date formatting
                var oWeekDates = this._getWeekDates();
                var sFormattedDate = this._formatDateForDisplay(oWeekDates[sDay]);

                // Create or reuse dialog
                if (!this._oHourEditDialog) {
                    // Create hour options for dropdown (0-15 hours)
                    var aHourOptions = [];
                    for (var i = 0; i <= 15; i++) {
                        aHourOptions.push(new Item({
                            key: i.toString(),
                            text: i + " hour" + (i !== 1 ? "s" : "")
                        }));
                    }

                    this._oHourEditDialog = new Dialog({
                        title: "Edit " + this._capitalize(sDay) + " Entry",
                        contentWidth: "350px",
                        titleAlignment: "Center",
                        content: [
                            new VBox({
                                items: [
                                    // Date Field - NON-EDITABLE
                                    new VBox({
                                        items: [
                                            new Label({
                                                text: "Date:",
                                                design: "Bold"
                                            }).addStyleClass("sapUiTinyMarginBottom"),
                                            new Input({
                                                value: "{/editData/date}",
                                                editable: false
                                            })
                                        ]
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    // Project Field - NON-EDITABLE
                                    new VBox({
                                        items: [
                                            new Label({
                                                text: "Project:",
                                                design: "Bold"
                                            }).addStyleClass("sapUiTinyMarginBottom"),
                                            new Input({
                                                value: "{/editData/projectName}",
                                                editable: false
                                            })
                                        ]
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    // Task Type Field - NON-EDITABLE
                                    new VBox({
                                        items: [
                                            new Label({
                                                text: "Task",
                                                design: "Bold"
                                            }).addStyleClass("sapUiTinyMarginBottom"),
                                            new Input({
                                                value: "{/editData/taskType}",
                                                editable: false
                                            })
                                        ]
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    // Hours Field - NON-EDITABLE
                                    new VBox({
                                        items: [
                                            new Label({
                                                text: "Hours:",
                                                design: "Bold",
                                                required: true
                                            }).addStyleClass("sapUiTinyMarginBottom"),
                                            new Input({
                                                value: "{/editData/hours}",
                                                editable: false
                                            })
                                        ]
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    // Task Details Field - NON-EDITABLE
                                    new VBox({
                                        items: [
                                            new Label({
                                                text: "Task Details:",
                                                design: "Bold"
                                            }).addStyleClass("sapUiTinyMarginBottom"),
                                            new TextArea({
                                                value: "{/editData/taskDetails}",
                                                rows: 4,
                                                width: "100%",
                                                editable: false
                                            })
                                        ]
                                    })
                                ]
                            }).addStyleClass("sapUiMediumMarginBeginEnd sapUiSmallMarginTopBottom")
                        ],
                        beginButton: new Button({
                            text: "Close",
                            type: "Emphasized",
                            press: function() {
                                this._oHourEditDialog.close();
                            }.bind(this)
                        })
                    });
                    this.getView().addDependent(this._oHourEditDialog);
                }

                // Get available projects for display
                var aProjects = oModel.getProperty("/projects") || [];
                // Find the current project name
                var sProjectName = oEntry.project || "";
                if (oEntry.projectId) {
                    var oCurrentProject = aProjects.find(function(project) {
                        return (project.projectId === oEntry.projectId) || (project.ID === oEntry.projectId);
                    });
                    if (oCurrentProject) {
                        sProjectName = oCurrentProject.name || oCurrentProject.projectName;
                    }
                }

                // Get day-specific task details from the entry
                var sDayTaskDetailsField = sDay + "TaskDetails";
                var sTaskDetails = oEntry[sDayTaskDetailsField] || oEntry.taskDetails || "";

                // Set up edit data model with real data from backend
                var oEditModel = new JSONModel({
                    editData: {
                        // Entry identification
                        entryIndex: oBindingContext.getPath().split("/")[2],
                        entryId: oEntry.ID,
                        day: sDay,
                        dayName: this._getDayDisplayName(sDay),
                        date: sFormattedDate, // Use properly formatted date
                        // Form fields with real data from backend
                        projectName: sProjectName,
                        projectId: oEntry.projectId,
                        taskType: oEntry.task || "", // Get task type from backend
                        hours: fCurrentHours > 0 ? fCurrentHours.toString() : "0", // Use actual hours from backend
                        taskDetails: sTaskDetails // Use actual task details from backend
                    }
                });

                this._oHourEditDialog.setModel(oEditModel);
                // Update dialog title with actual day name
                var sDayName = this._getDayDisplayName(sDay);
                this._oHourEditDialog.setTitle("Edit " + sDayName + " Entry");
                this._oHourEditDialog.open();
            } catch (oError) {
                console.error("Error in onHourButtonPress:", oError);
                MessageToast.show("Error opening edit dialog");
            }
        },

        _capitalize: function(sString) {
            if (!sString) return "";
            return sString.charAt(0).toUpperCase() + sString.slice(1);
        },

        _getDayDisplayName: function(sDay) {
            var dayNames = {
                "monday": "Monday",
                "tuesday": "Tuesday",
                "wednesday": "Wednesday",
                "thursday": "Thursday",
                "friday": "Friday",
                "saturday": "Saturday",
                "sunday": "Sunday"
            };
            return dayNames[sDay] || "Day";
        },

        _getDayIndex: function(sDay) {
            var dayMap = {
                "monday": 0,
                "tuesday": 1,
                "wednesday": 2,
                "thursday": 3,
                "friday": 4,
                "saturday": 5,
                "sunday": 6
            };
            return dayMap[sDay] || 0;
        },

        _formatDateForDisplay: function(date) {
            if (!date) return "";
            var oDate = new Date(date);
            var options = {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            };
            return oDate.toLocaleDateString('en-US', options);
        },

        _getWeekDates: function() {
            var oModel = this.getView().getModel();
            var currentWeekStart = new Date(oModel.getProperty("/currentWeekStart"));
            var weekDates = {
                monday: new Date(currentWeekStart),
                tuesday: new Date(currentWeekStart),
                wednesday: new Date(currentWeekStart),
                thursday: new Date(currentWeekStart),
                friday: new Date(currentWeekStart),
                saturday: new Date(currentWeekStart),
                sunday: new Date(currentWeekStart)
            };
            // Set each day of the week
            weekDates.tuesday.setDate(weekDates.tuesday.getDate() + 1);
            weekDates.wednesday.setDate(weekDates.wednesday.getDate() + 2);
            weekDates.thursday.setDate(weekDates.thursday.getDate() + 3);
            weekDates.friday.setDate(weekDates.friday.getDate() + 4);
            weekDates.saturday.setDate(weekDates.saturday.getDate() + 5);
            weekDates.sunday.setDate(weekDates.sunday.getDate() + 6);
            return weekDates;
        },

        formatVarianceState: function(nVariance) {
            if (nVariance > 10) {
                return "Error"; // Significantly over budget
            } else if (nVariance > 0) {
                return "Warning"; // Slightly over budget
            } else if (nVariance < -10) {
                return "Warning"; // Significantly under budget
            } else {
                return "Success"; // Within acceptable range
            }
        },

        // Add missing notification handler
        onNotificationPress: function() {
            MessageToast.show("Notifications feature not implemented yet");
        }

    });
});
