UPDATED CODE 3

// Now, let's update the controller with the necessary changes:
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/type/Float",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/m/Input",
    "sap/m/Button",
    "sap/ui/core/Item",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/m/DateRangeSelection",
    "sap/m/CheckBox",
    "sap/m/TextArea",
    "sap/m/SegmentedButton",
    "sap/m/SegmentedButtonItem",
    "sap/m/Popover",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/ObjectStatus",
    "sap/m/Text",
    "sap/m/ToolbarSpacer",
    "sap/m/OverflowToolbar",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Menu",
    "sap/m/MenuItem",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageBox, MessageToast, JSONModel, FloatType, Dialog, VBox, Label,
    ComboBox, Input, Button, Item, History, Fragment, DateRangeSelection, CheckBox, TextArea,
    SegmentedButton, SegmentedButtonItem, Popover, List, StandardListItem, ObjectStatus,
    Text, ToolbarSpacer, OverflowToolbar, Table, Column, ColumnListItem, Menu, MenuItem, BusyIndicator) {
    "use strict";

    return Controller.extend("admin.com.admin.controller.Employee", {
        onInit: function () {
            this._initializeModel();
            this._initializeCurrentWeek();
            this._loadData();
            this._oRouter = this.getOwnerComponent().getRouter();
            if (!this._oRouter) {
                this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            }

            // Attach route matched event to reload data when navigating back
            this._oRouter.getRoute("employee").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Reload data every time the route is matched
            this._loadData();
        },

        // Formatter function to calculate row total
        formatRowTotal: function (monday, tuesday, wednesday, thursday, friday, saturday, sunday) {
            var total = (parseFloat(monday) || 0) +
                (parseFloat(tuesday) || 0) +
                (parseFloat(wednesday) || 0) +
                (parseFloat(thursday) || 0) +
                (parseFloat(friday) || 0) +
                (parseFloat(saturday) || 0) +
                (parseFloat(sunday) || 0);
            return total.toFixed(2);
        },

        // Format day with date
        formatDayWithDate: function (day, formattedDate) {
            return day + " (" + formattedDate + ")";
        },

        _initializeModel: function () {
            var oModel = new JSONModel({
                currentWeek: "",
                totalWeekHours: "0.00",
                isSubmitted: false,
                timeEntriesCount: "0",
                commentsCount: "0",
                selectedDate: null,
                isCurrentWeek: true,
                assignedProjects: [],
                availableActivities: [],
                nonProjectTypes: [],
                workTypes: [
                    { type: "DESIGN", name: "Designing" },
                    { type: "DEVELOP", name: "Developing" },
                    { type: "TEST", name: "Testing" },
                    { type: "DEPLOY", name: "Deployment" },
                    { type: "MEETING", name: "Meetings" },
                    { type: "DOCUMENTATION", name: "Documentation" },
                    { type: "LEAVE", name: "Leave" },
                    { type: "TRAINING", name: "Training" }
                ],
                timeEntries: [],
                dailyTotals: {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                },
                dailyTotalsArray: [],
                dailyComments: [
                    { day: "monday", comment: "", lastUpdated: "" },
                    { day: "Tuesday", comment: "", lastUpdated: "" },
                    { day: "Wednesday", comment: "", lastUpdated: "" },
                    { day: "Thursday", comment: "", lastUpdated: "" },
                    { day: "Friday", comment: "", lastUpdated: "" },
                    { day: "Saturday", comment: "", lastUpdated: "" },
                    { day: "Sunday", comment: "", lastUpdated: "" }
                ],
                projectEngagement: [],
                weekDates: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: "",
                    mondayFormatted: "",
                    tuesdayFormatted: "",
                    wednesdayFormatted: "",
                    thursdayFormatted: "",
                    fridayFormatted: "",
                    saturdayFormatted: "",
                    sundayFormatted: ""
                },
                editEntry: {},
                newEntry: {
                    selectedDate: "",
                    projectId: "",
                    workType: "",
                    hours: "", // Changed from "8" to empty string
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                },
                newDailyComment: {
                    day: "",
                    comment: ""
                },
                employeeProjectHours: [],
                employeeProjectDurations: [],
                currentMonth: "",
                projects: [],
                selectedProject: "",
                dueDateStart: null,
                dueDateEnd: null,
                selectedWorkType: "DESIGN",
                statusOptions: [
                    { key: "todo", text: "To Do" },
                    { key: "inprogress", text: "In Progress" },
                    { key: "done", text: "Done" },
                    { key: "review", text: "Under Review" }
                ],
                selectedStatus: "todo",
                priorityOptions: [
                    { key: "low", text: "Low" },
                    { key: "medium", text: "Medium" },
                    { key: "high", text: "High" },
                    { key: "urgent", text: "Urgent" }
                ],
                selectedPriority: "medium",
                needInput: false,
                newCommentText: "",
                existingComments: [],
                editCommentText: "",
                editCommentId: "",
                editDayHours: {
                    day: "",
                    hours: 0,
                    entryId: "",
                    dayProperty: ""
                },
                profile: {
                    employee_ID: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    managerName: "",
                    managerEmail: "",
                    activeStatus: "",
                    changedBy: "",
                    userRole: ""
                },
                dailySummary: []
            });
            this.getView().setModel(oModel);
        },

        _loadData: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var that = this;
            var oViewModel = this.getView().getModel();

            // Show loading indicator
            BusyIndicator.show(0);

            Promise.all([
                this._readODataEntity(oDataModel, "/MyProfile"),
                this._readODataEntity(oDataModel, "/MyProjects"),
                this._readODataEntity(oDataModel, "/MyTimesheets"),
                this._readODataEntity(oDataModel, "/AvailableActivities"),
                this._readODataEntity(oDataModel, "/AvailableNonProjectTypes"),
                this._readODataEntity(oDataModel, "/MyDailySummary")
            ]).then(function (aResults) {
                // Process profile data
                var oProfileData = aResults[0];
                if (oProfileData) {
                    var oProfile = {
                        // employee_ID: oProfileData.employee_ID || oProfileData.employee_ID || "",
                        firstName: oProfileData.FirstName || oProfileData.firstName || "",
                        lastName: oProfileData.LastName || oProfileData.lastName || "",
                        email: oProfileData.Email || oProfileData.email || "",
                        managerName: oProfileData.ManagerName || oProfileData.managerName || "",
                        managerEmail: oProfileData.ManagerEmail || oProfileData.managerEmail || "",
                        activeStatus: oProfileData.ActiveStatus || oProfileData.activeStatus || "",
                        changedBy: oProfileData.ChangedBy || oProfileData.changedBy || "",
                        userRole: oProfileData.UserRole || oProfileData.userRole || ""
                    };
                    oViewModel.setProperty("/profile", oProfile);

                    // Set employee name in the page header if available
                    var sEmployeeName = oProfile.firstName + " " + oProfile.lastName;
                    var oEmployeeNameText = that.getView().byId("employeeNameText");
                    if (oEmployeeNameText) {
                        oEmployeeNameText.setText(sEmployeeName);
                    }
                }

                // Process projects data - enhanced to match your image structure
                var aProjects = aResults[1] && aResults[1].value ? aResults[1].value : (aResults[1] && aResults[1].results ? aResults[1].results : []);
                var aFormattedProjects = aProjects.map(function (project) {
                    return {
                        projectId: project.projectID || project.projectId || project.ID || project.project_ID,
                        projectCode: project.projectCode || project.code || "",
                        projectName: project.Project || project.projectName || project.Name || project.projectName,
                        managerName: project.managerName || project.Manager || project.Manager_Name || "Not Assigned",
                        status: project.status || project.Status || "Active",
                        startDate: project.StartDate || project.startDate || project.Start_Date,
                        endDate: project.EndDate || project.endDate || project.End_Date,
                        allocatedHours: project.AllocateHours || project.allocatedHours || project.Allocated_Hours || 0,
                        bookedHours: project.BookedHours || project.bookedHours || 0,
                        remainingHours: project.RemainingHours || project.remainingHours || 0,
                        utilization: project.Utilization || project.utilization || 0,
                        duration: project.Duration || project.duration || 0,
                        daysRemaining: project.DaysRemaining || project.daysRemaining || 0,
                        timelineStatus: project.TimelineStatus || project.timelineStatus || "Active"
                    };
                });

                oViewModel.setProperty("/assignedProjects", aFormattedProjects);
                oViewModel.setProperty("/projects", aFormattedProjects.map(function (p) {
                    return {
                        id: p.projectId,
                        name: p.projectName,
                        code: p.projectCode
                    };
                }));

                if (aFormattedProjects.length > 0) {
                    oViewModel.setProperty("/selectedProject", aFormattedProjects[0].projectId);
                }

                // Process available activities
                var aAvailableActivities = aResults[3] && aResults[3].results ? aResults[3].results : [];
                var aFormattedActivities = aAvailableActivities.map(function (activity) {
                    return {
                        activityId: activity.activityId || activity.ID,
                        activityName: activity.activityName || activity.Name,
                        description: activity.description || activity.Description
                    };
                });
                oViewModel.setProperty("/availableActivities", aFormattedActivities);

                var aNonProjectTypes = aResults[4] && aResults[4].results ? aResults[4].results : [];
                var aFormattedNonProjectTypes = aNonProjectTypes.map(function (type) {
                    return {
                        typeId: type.typeId || type.ID,
                        typeName: type.typeName || type.Name,
                        description: type.description || type.Description
                    };
                });
                oViewModel.setProperty("/nonProjectTypes", aFormattedNonProjectTypes);

                // Process timesheets data
                var aTimesheets = aResults[2] && aResults[2].results ? aResults[2].results : [];
                var aFormattedTimesheets = aTimesheets.map(function (timesheet) {
                    var oDayHours = {
                        monday: parseFloat(timesheet.monday || timesheet.Monday || 0),
                        tuesday: parseFloat(timesheet.tuesday || timesheet.Tuesday || 0),
                        wednesday: parseFloat(timesheet.wednesday || timesheet.Wednesday || 0),
                        thursday: parseFloat(timesheet.thursday || timesheet.Thursday || 0),
                        friday: parseFloat(timesheet.friday || timesheet.Friday || 0),
                        saturday: parseFloat(timesheet.saturday || timesheet.Saturday || 0),
                        sunday: parseFloat(timesheet.sunday || timesheet.Sunday || 0)
                    };

                    return {
                        id: timesheet.id || timesheet.ID,
                        projectId: timesheet.projectId || timesheet.project_ID || timesheet.projectID,
                        projectName: timesheet.projectName || "",
                        workTypeName: timesheet.activity || timesheet.task || timesheet.workTypeName,
                        workType: that._mapActivityToWorkType(timesheet.activity || timesheet.task || timesheet.workTypeName),
                        comment: timesheet.taskDetails || timesheet.comment || timesheet.Description || "",
                        status: timesheet.status || timesheet.Status || "Pending",
                        isApproved: (timesheet.status === "Approved") || (timesheet.Status === "Approved") || false,
                        isFutureDay: false,
                        dailyComments: {
                            monday: timesheet.mondayComment || timesheet.monday_Comment || "",
                            tuesday: timesheet.tuesdayComment || timesheet.Tuesday_Comment || "",
                            wednesday: timesheet.wednesdayComment || timesheet.Wednesday_Comment || "",
                            thursday: timesheet.thursdayComment || timesheet.Thursday_Comment || "",
                            friday: timesheet.fridayComment || timesheet.Friday_Comment || "",
                            saturday: timesheet.saturdayComment || timesheet.Saturday_Comment || "",
                            sunday: timesheet.sundayComment || timesheet.Sunday_Comment || ""
                        },
                        ...oDayHours
                    };
                });

                oViewModel.setProperty("/timeEntries", aFormattedTimesheets);

                // Process daily summary data
                var aDailySummary = aResults[5] && aResults[5].results ? aResults[5].results : [];
                var oDailyTotals = {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                };

                // Calculate daily totals from time entries
                aFormattedTimesheets.forEach(function (entry) {
                    oDailyTotals.monday += parseFloat(entry.monday) || 0;
                    oDailyTotals.tuesday += parseFloat(entry.tuesday) || 0;
                    oDailyTotals.wednesday += parseFloat(entry.wednesday) || 0;
                    oDailyTotals.thursday += parseFloat(entry.thursday) || 0;
                    oDailyTotals.friday += parseFloat(entry.friday) || 0;
                    oDailyTotals.saturday += parseFloat(entry.saturday) || 0;
                    oDailyTotals.sunday += parseFloat(entry.sunday) || 0;
                });

                oViewModel.setProperty("/dailyTotals", oDailyTotals);
                oViewModel.setProperty("/dailySummary", aDailySummary);

                // Check if timesheet is submitted
                var bIsSubmitted = aFormattedTimesheets.length > 0 &&
                    aFormattedTimesheets.every(function (entry) {
                        return entry.status === "Submitted" || entry.status === "Approved";
                    });
                oViewModel.setProperty("/isSubmitted", bIsSubmitted);

                that._calculateAllTotals();
                that._updateCounts();
                that._updateProjectEngagement();
                that._updateReportsData();

                // Force refresh to ensure UI updates
                oViewModel.refresh(true);

                // Hide loading indicator
                BusyIndicator.hide();

                // Show success message
                MessageToast.show("Timesheet data loaded successfully");
            }).catch(function (oError) {
                BusyIndicator.hide();
                MessageBox.error("Failed to load timesheet data");
                console.error("Error loading data:", oError);
            });
        },

        _readODataEntity: function (oModel, sPath) {
            return new Promise(function (resolve, reject) {
                oModel.read(sPath, {
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        console.warn("Error reading " + sPath + ":", oError);
                        resolve({}); // Resolve with empty object instead of rejecting
                    }
                });
            });
        },

        _mapActivityToWorkType: function (activity) {
            var activityMap = {
                "Designing": "DESIGN",
                "Developing": "DEVELOP",
                "Testing": "TEST",
                "Deployment": "DEPLOY",
                "Meetings": "MEETING",
                "Documentation": "DOCUMENTATION",
                "Leave": "LEAVE",
                "Training": "TRAINING"
            };

            return activityMap[activity] || "DEVELOP";
        },

        _initializeCurrentWeek: function () {
            var today = new Date();
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            oModel.setProperty("/isCurrentWeek", true);
            this._updateWeekDates(today);

            var months = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            oModel.setProperty("/currentMonth", months[today.getMonth()] + " " + today.getFullYear());
        },

        _updateWeekDates: function (oDate) {
            var oModel = this.getView().getModel();
            var startDate = new Date(oDate);
            var day = startDate.getDay();
            var diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            var monday = new Date(startDate.setDate(diff));
            var tuesday = new Date(monday);
            tuesday.setDate(monday.getDate() + 1);
            var wednesday = new Date(monday);
            wednesday.setDate(monday.getDate() + 2);
            var thursday = new Date(monday);
            thursday.setDate(monday.getDate() + 3);
            var friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            var saturday = new Date(monday);
            saturday.setDate(monday.getDate() + 5);
            var sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            var oWeekDates = {
                monday: this._formatDateForModel(monday),
                tuesday: this._formatDateForModel(tuesday),
                wednesday: this._formatDateForModel(wednesday),
                thursday: this._formatDateForModel(thursday),
                friday: this._formatDateForModel(friday),
                saturday: this._formatDateForModel(saturday),
                sunday: this._formatDateForModel(sunday),
                mondayFormatted: this._formatDateDisplay(monday),
                tuesdayFormatted: this._formatDateDisplay(tuesday),
                wednesdayFormatted: this._formatDateDisplay(wednesday),
                thursdayFormatted: this._formatDateDisplay(thursday),
                fridayFormatted: this._formatDateDisplay(friday),
                saturdayFormatted: this._formatDateDisplay(saturday),
                sundayFormatted: this._formatDateDisplay(sunday)
            };
            var sCurrentWeek = this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday) + " " + sunday.getFullYear();
            oModel.setProperty("/weekDates", oWeekDates);
            oModel.setProperty("/currentWeek", sCurrentWeek);

            var today = new Date();
            var isCurrentWeek = today >= monday && today <= sunday;
            oModel.setProperty("/isCurrentWeek", isCurrentWeek);

            Object.keys(oWeekDates).forEach(function (sDay) {
                if (sDay.endsWith("Formatted")) return;
                var dayDate = new Date(oWeekDates[sDay]);
                var isFuture = dayDate > today;
                oWeekDates[sDay + "IsFuture"] = isFuture;
            });
            oModel.setProperty("/weekDates", oWeekDates);
        },

        _formatDateForModel: function (oDate) {
            return oDate.getFullYear() + "-" +
                ("0" + (oDate.getMonth() + 1)).slice(-2) + "-" +
                ("0" + oDate.getDate()).slice(-2);
        },

        _formatDateDisplay: function (oDate) {
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[oDate.getMonth()] + " " + ("0" + oDate.getDate()).slice(-2);
        },

        _updateCounts: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aComments = oModel.getProperty("/dailyComments");
            var iCommentsWithText = aComments.filter(function (comment) {
                return comment.comment && comment.comment.trim() !== "";
            }).length;
            oModel.setProperty("/timeEntriesCount", aEntries.length.toString());
            oModel.setProperty("/commentsCount", iCommentsWithText.toString());
        },

        onTaskDetailPress: function (oEvent) {
            try {
                var oButton = oEvent.getSource();
                var oBindingContext = oButton.getBindingContext();

                if (!oBindingContext) {
                    sap.m.MessageToast.show("Unable to get binding context");
                    return;
                }

                var oEntry = oBindingContext.getObject();

                if (!oEntry) {
                    sap.m.MessageToast.show("Unable to get entry data");
                    return;
                }

                var oModel = this.getView().getModel();
                var oWeekDates = oModel.getProperty("/weekDates");

                if (!oWeekDates) {
                    sap.m.MessageToast.show("Week dates not available");
                    return;
                }

                // Ensure comments exist
                oEntry.dailyComments = oEntry.dailyComments || {};

                // Prepare combined text with task details and comments
                var sCombinedText = "";

                // Add task details if available
                if (oEntry.comment && oEntry.comment.trim() !== "") {
                    sCombinedText += "TASK DETAILS:\n" + oEntry.comment + "\n\n";
                }

                // Add daily comments section
                sCombinedText += "DAILY COMMENTS:\n";

                // Prepare daily data - show all days regardless of hours
                var aDays = [
                    { day: "monday", date: oWeekDates.mondayFormatted, hours: oEntry.monday, comment: oEntry.dailyComments.monday },
                    { day: "tuesday", date: oWeekDates.tuesdayFormatted, hours: oEntry.tuesday, comment: oEntry.dailyComments.tuesday },
                    { day: "wednesday", date: oWeekDates.wednesdayFormatted, hours: oEntry.wednesday, comment: oEntry.dailyComments.wednesday },
                    { day: "thursday", date: oWeekDates.thursdayFormatted, hours: oEntry.thursday, comment: oEntry.dailyComments.thursday },
                    { day: "friday", date: oWeekDates.fridayFormatted, hours: oEntry.friday, comment: oEntry.dailyComments.friday },
                    { day: "saturday", date: oWeekDates.saturdayFormatted, hours: oEntry.saturday, comment: oEntry.dailyComments.saturday },
                    { day: "sunday", date: oWeekDates.sundayFormatted, hours: oEntry.sunday, comment: oEntry.dailyComments.sunday }
                ];

                // Add each day's information
                aDays.forEach(function (oDay) {
                    var sDayName = this._capitalize(oDay.day);
                    var fHours = parseFloat(oDay.hours) || 0;
                    var sComment = oDay.comment || "No comment added";

                    sCombinedText += sDayName + " (" + oDay.date + "): " + fHours + " hours\n";
                    sCombinedText += "  Comment: " + sComment + "\n\n";
                }.bind(this));

                // Create Popover with a single TextArea showing combined information
                var oPopover = new sap.m.Popover({
                    placement: sap.m.PlacementType.Auto,
                    title: "Task Details & Comments",
                    contentWidth: "400px",
                    content: new sap.m.TextArea({
                        value: sCombinedText,
                        editable: false,
                        rows: 15,
                        width: "100%"
                    }).addStyleClass("sapUiSmallMargin"),
                    footer: new sap.m.OverflowToolbar({
                        content: [
                            new sap.m.ToolbarSpacer(),
                            new sap.m.Button({
                                text: "Close",
                                type: "Emphasized",
                                press: function () {
                                    oPopover.close();
                                }
                            })
                        ]
                    })
                });

                this.getView().addDependent(oPopover);
                oPopover.openBy(oButton);

            } catch (oError) {
                sap.m.MessageBox.error("Error showing task details: " + oError.message);
                console.error("Error in onTaskDetailPress:", oError);
            }
        },
        /**
         * Helper function to capitalize first letter
         */
        _capitalize: function (sText) {
            return sText ? sText.charAt(0).toUpperCase() + sText.slice(1) : "";
        },

        onInfoPress: function () {
            if (!this._oCommentOptionsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.CommentOptions",
                    controller: this
                }).then(function (oDialog) {
                    this._oCommentOptionsDialog = oDialog;
                    this.getView().addDependent(this._oCommentOptionsDialog);
                    this._initializeCommentData();
                    this._oCommentOptionsDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading comment dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._initializeCommentData();
                this._oCommentOptionsDialog.open();
            }
        },

        _initializeCommentData: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentCommentType", "daily");
            oModel.setProperty("/selectedDay", "monday");
            oModel.setProperty("/dailyCommentText", "");
            oModel.setProperty("/weeklyCommentText", "");
            oModel.setProperty("/monthlyCommentText", "");
            oModel.setProperty("/newCommentText", "");
            oModel.setProperty("/needInput", false);

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            if (aProjects && aProjects.length > 0) {
                oModel.setProperty("/selectedProject", aProjects[0].id);
            }
            if (aWorkTypes && aWorkTypes.length > 0) {
                oModel.setProperty("/selectedWorkType", aWorkTypes[0].type);
            }
            oModel.setProperty("/selectedStatus", "todo");
            oModel.setProperty("/selectedPriority", "medium");

            var today = new Date();
            var todayStr = today.getFullYear() + "-" +
                ("0" + (today.getMonth() + 1)).slice(-2) + "-" +
                ("0" + today.getDate()).slice(-2);
            oModel.setProperty("/dueDateStart", todayStr);
            oModel.setProperty("/dueDateEnd", todayStr);
        },

        onCommentTypeSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentCommentType", sKey);
            MessageToast.show("Switched to " + sKey + " comments");
        },

        onAddNewComment: function () {
            var oModel = this.getView().getModel();
            var sNewComment = oModel.getProperty("/newCommentText");
            if (!sNewComment || sNewComment.trim() === "") {
                MessageBox.error("Please enter a comment");
                return;
            }

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Just Now",
                text: sNewComment
            });
            oModel.setProperty("/existingComments", aExistingComments);
            oModel.setProperty("/newCommentText", "");
            MessageToast.show("Comment added successfully");
        },

        onSaveCommentOption: function () {
            var oModel = this.getView().getModel();
            var sCommentType = oModel.getProperty("/currentCommentType");
            if (sCommentType === "daily") {
                this._saveDailyComment();
            } else if (sCommentType === "weekly") {
                this._saveWeeklyComment();
            } else if (sCommentType === "monthly") {
                this._saveMonthlyComment();
            }
        },

        _saveCommentToTimesheet: function (sComment, sType, sProjectName, sWorkTypeName) {
            var oModel = this.getView().getModel();
            var aTimeEntries = oModel.getProperty("/timeEntries");

            var oCommentEntry = {
                id: "c" + Date.now(),
                projectId: "comment",
                projectName: sProjectName || "Comment",
                workTypeName: sWorkTypeName || (sType + " Comment"),
                workType: "COMMENT",
                status: "Approved",
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: sComment,
                isApproved: true,
                isFutureDay: false,
                isCommentEntry: true,
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };

            aTimeEntries.push(oCommentEntry);
            oModel.setProperty("/timeEntries", aTimeEntries);

            // Save to backend
            this._persistToBackend(oCommentEntry)
                .then(function () {
                    var oTable = this.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }
                    MessageToast.show(sType + " comment saved to timesheet");
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error("Failed to save comment to server");
                    console.error("Error saving comment:", oError);
                });
        },

        _saveDailyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/dailyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");
            var sStatus = oModel.getProperty("/selectedStatus");
            var sPriority = oModel.getProperty("/selectedPriority");
            var bNeedInput = oModel.getProperty("/needInput");
            var sSelectedDay = oModel.getProperty("/selectedDay");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a description for the daily comment");
                return;
            }
            if (!sProject) {
                MessageBox.error("Please select a project");
                return;
            }
            if (!sWorkType) {
                MessageBox.error("Please select a work type");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var aStatusOptions = oModel.getProperty("/statusOptions");
            var aPriorityOptions = oModel.getProperty("/priorityOptions");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });
            var oSelectedStatus = aStatusOptions.find(function (item) { return item.key === sStatus; });
            var oSelectedPriority = aPriorityOptions.find(function (item) { return item.key === sPriority; });

            var oCommentData = {
                type: "daily",
                day: sSelectedDay,
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                status: oSelectedStatus ? oSelectedStatus.text : "Unknown",
                priority: oSelectedPriority ? oSelectedPriority.text : "Unknown",
                dueDateStart: oModel.getProperty("/dueDateStart"),
                dueDateEnd: oModel.getProperty("/dueDateEnd"),
                description: sComment,
                needInput: bNeedInput,
                timestamp: new Date().toISOString()
            };

            console.log("Saving daily comment:", oCommentData);

            var sFormattedComment = "[" + sSelectedDay + "] " + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown") +
                "\nStatus: " + (oSelectedStatus ? oSelectedStatus.text : "Unknown") +
                "\nPriority: " + (oSelectedPriority ? oSelectedPriority.text : "Unknown");

            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedDay;
            });
            var now = new Date();
            var timeStr = now.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            if (oDayComment) {
                oDayComment.comment = sComment;
                oDayComment.lastUpdated = timeStr;
            } else {
                aDailyComments.push({
                    day: sSelectedDay,
                    comment: sComment,
                    lastUpdated: timeStr
                });
            }
            oModel.setProperty("/dailyComments", aDailyComments);
            this._updateCounts();

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Daily",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveWeeklyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/weeklyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a weekly summary");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });

            var oCommentData = {
                type: "weekly",
                week: oModel.getProperty("/currentWeek"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                summary: sComment,
                timestamp: new Date().toISOString()
            };

            console.log("Saving weekly comment:", oCommentData);

            var sFormattedComment = "[Weekly Summary - " + oModel.getProperty("/currentWeek") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Weekly Summary - " + new Date().toLocaleDateString(),
                text: "[WEEKLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Weekly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveMonthlyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/monthlyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a monthly review");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });

            var oCommentData = {
                type: "monthly",
                month: oModel.getProperty("/currentMonth"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                review: sComment,
                timestamp: new Date().toISOString()
            };

            console.log("Saving monthly comment:", oCommentData);

            var sFormattedComment = "[Monthly Review - " + oModel.getProperty("/currentMonth") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Monthly Review - " + new Date().toLocaleDateString(),
                text: "[MONTHLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Monthly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        onCancelCommentOption: function () {
            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        onDaySelect: function (oEvent) {
            var oModel = this.getView().getModel();
            var sSelectedKey = oEvent.getParameter("selectedKey");
            oModel.setProperty("/selectedDay", sSelectedKey);

            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedKey;
            });
            if (oDayComment && oDayComment.comment) {
                oModel.setProperty("/dailyCommentText", oDayComment.comment);
            } else {
                oModel.setProperty("/dailyCommentText", "");
            }
        },

        onEditComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();

            oModel.setProperty("/editCommentText", oEntry.comment);
            oModel.setProperty("/editCommentId", oEntry.id);

            if (!this._oEditCommentDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditComment",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditCommentDialog = oDialog;
                    this.getView().addDependent(this._oEditCommentDialog);
                    this._oEditCommentDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading edit comment dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oEditCommentDialog.open();
            }
        },

        onSaveEditedComment: function () {
            var oModel = this.getView().getModel();
            var sCommentText = oModel.getProperty("/editCommentText");
            var sCommentId = oModel.getProperty("/editCommentId");
            var that = this;

            if (!sCommentText || sCommentText.trim() === "") {
                MessageBox.error("Comment cannot be empty");
                return;
            }

            var aTimeEntries = oModel.getProperty("/timeEntries");
            var oCommentEntry = aTimeEntries.find(function (entry) {
                return entry.id === sCommentId;
            });

            if (oCommentEntry) {
                oCommentEntry.comment = sCommentText;
                oModel.setProperty("/timeEntries", aTimeEntries);

                // Save to backend
                this._persistToBackend(oCommentEntry)
                    .then(function () {
                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }
                        MessageToast.show("Comment updated successfully");

                        if (that._oEditCommentDialog) {
                            that._oEditCommentDialog.close();
                        }
                    })
                    .catch(function (oError) {
                        MessageBox.error("Failed to save comment to server");
                        console.error("Error saving comment:", oError);
                    });
            }
        },

        onCancelEditComment: function () {
            if (this._oEditCommentDialog) {
                this._oEditCommentDialog.close();
            }
        },

        onDeleteComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var that = this;

            MessageBox.confirm("Are you sure you want to delete this comment?", {
                title: "Delete Comment",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = that.getView().getModel();
                        var aTimeEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aTimeEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            var oDeletedEntry = aTimeEntries[iIndex];
                            aTimeEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aTimeEntries);

                            // Delete from backend
                            var oDataModel = that.getOwnerComponent().getModel("timesheetServiceV2");
                            if (oDataModel) {
                                oDataModel.remove("/MyTimesheets('" + oDeletedEntry.id + "')", {
                                    success: function () {
                                        var oTable = that.getView().byId("timesheetTable");
                                        if (oTable && oTable.getBinding("items")) {
                                            oTable.getBinding("items").refresh();
                                        }
                                        MessageToast.show("Comment deleted successfully");
                                    },
                                    error: function (oError) {
                                        MessageBox.error("Failed to delete comment from server");
                                        console.error("Error deleting comment:", oError);
                                    }
                                });
                            } else {
                                var oTable = that.getView().byId("timesheetTable");
                                if (oTable && oTable.getBinding("items")) {
                                    oTable.getBinding("items").refresh();
                                }
                                MessageToast.show("Comment deleted successfully");
                            }
                        }
                    }
                }
            });
        },

        onCommentLiveChange: function (oEvent) {
            // This function can be used for live validation if needed
        },

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            MessageToast.show("Switched to " + sKey + " tab");
            if (sKey === "reports") {
                this._updateReportsData();
            }
        },

        onAddEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = {
                selectedDate: this._formatDateForModel(new Date()),
                projectId: "",
                workType: "",
                hours: "", // Changed from "8" to empty string
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: "",
                taskDetails: "",
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };
            oModel.setProperty("/newEntry", oNewEntry);

            if (!this._oAddEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.AddTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oAddEntryDialog = oDialog;
                    this.getView().addDependent(this._oAddEntryDialog);
                    this._oAddEntryDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading add time entry dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oAddEntryDialog.open();
            }
        },

        onEntryDatePickerChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sDate = oDatePicker.getValue();
            if (sDate) {
                var selectedDate = new Date(sDate);
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry/selectedDate", this._formatDateForModel(selectedDate));

                var oWeekDates = oModel.getProperty("/weekDates");
                var monday = new Date(oWeekDates.monday);
                var sunday = new Date(oWeekDates.sunday);
                if (selectedDate < monday || selectedDate > sunday) {
                    MessageBox.warning("The selected date is outside the current week. Please select a date within " +
                        this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday));
                }
            }
        },

        onFragmentHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            this._calculateAllTotals();
        },

        ontaskDetailsLiveChange: function (oEvent) {
            var oTextArea = oEvent.getSource();
            var sValue = oTextArea.getValue();
            var oModel = this.getView().getModel();

            oModel.setProperty("/newEntry/taskDetails", sValue);

            if (sValue.length >= 45) {
                oTextArea.addStyleClass("sapUiFieldWarning");
            } else {
                oTextArea.removeStyleClass("sapUiFieldWarning");
            }
        },

        _saveTimeEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = oModel.getProperty("/newEntry");
            var that = this;

            if (!oNewEntry.projectId || oNewEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return false;
            }
            if (!oNewEntry.workType || oNewEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return false;
            }

            var selectedDate = new Date(oNewEntry.selectedDate);
            var dayOfWeek = selectedDate.getDay();

            var dayMap = {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday"
            };
            var dayProperty = dayMap[dayOfWeek];

            var hoursForDay = parseFloat(oNewEntry.hours) || 0;

            if (hoursForDay === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return false;
            }

            var aEntries = oModel.getProperty("/timeEntries");

            // Check for duplicate entry
            var existingEntryIndex = aEntries.findIndex(function (entry) {
                return entry.projectId === oNewEntry.projectId && entry.workType === oNewEntry.workType;
            });

            if (existingEntryIndex !== -1) {
                var existingEntry = aEntries[existingEntryIndex];

                // Check if the existing entry already has hours for this day
                if (existingEntry[dayProperty] > 0) {
                    MessageBox.error("An entry with the same project and work type already exists for this day. Please edit the existing entry instead.");
                    return false;
                }

                if (existingEntry.isApproved) {
                    this._notifyManagerOfChange(existingEntry, "Time entry modified");
                }

                existingEntry[dayProperty] = hoursForDay;
                existingEntry.comment = oNewEntry.taskDetails || "";

                // Update daily comment for the specific day
                if (!existingEntry.dailyComments) {
                    existingEntry.dailyComments = {};
                }
                existingEntry.dailyComments[dayProperty] = oNewEntry.dailyComment || "";

                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                this._persistToBackend(existingEntry)
                // .then(function () {
                //     that._calculateAllTotals();
                //     that._updateCounts();
                //     that._updateProjectEngagement();
                //     that._updateReportsData();

                //     var oTable = that.getView().byId("timesheetTable");
                //     if (oTable && oTable.getBinding("items")) {
                //         oTable.getBinding("items").refresh();
                //     }

                //     MessageToast.show("Time entry updated successfully");
                // })

            } else {
                var sNewId = "temp-" + Date.now();
                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oNewEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oNewEntry.workType;
                });

                var oTimeEntry = {
                    id: sNewId,
                    projectId: oNewEntry.projectId,
                    projectName: oProject ? oProject.projectName : "",
                    workType: oNewEntry.workType,
                    workTypeName: oWorkType ? oWorkType.name : "",
                    status: "Draft",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: oNewEntry.taskDetails || "",
                    isApproved: false,
                    isFutureDay: false,
                    dailyComments: {}
                };

                oTimeEntry[dayProperty] = hoursForDay;

                // Set daily comment for the specific day
                oTimeEntry.dailyComments[dayProperty] = oNewEntry.dailyComment || "";

                aEntries.push(oTimeEntry);
                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                var oPromise = this._persistToBackend(oTimeEntry);

                if (oPromise && typeof oPromise.then === 'function') {
                    oPromise.then(function (oResponse) {
                        // Update the ID with the one from the backend if it's a new entry
                        if (oResponse && oResponse.ID) {
                            oTimeEntry.id = oResponse.ID;
                            oModel.setProperty("/timeEntries", aEntries);
                        }

                        that._calculateAllTotals();
                        that._updateCounts();
                        that._updateProjectEngagement();
                        that._updateReportsData();

                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        MessageToast.show("Time entry added successfully");
                    }).catch(function (oError) {
                        MessageToast.show("Failed to save time entry");
                        console.error("Error saving time entry:", oError);
                    });
                } else {
                    // If _persistToBackend doesn't return a promise, handle synchronously
                    that._calculateAllTotals();
                    that._updateCounts();
                    that._updateProjectEngagement();
                    that._updateReportsData();

                    var oTable = that.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }

                    MessageToast.show("Time entry added successfully");
                }
            }

            return true;
        },


        onSaveNewEntry: function () {
            if (this._saveTimeEntry()) {
                this._oAddEntryDialog.close();
            }
        },

        onSaveAndNewEntry: function () {
            if (this._saveTimeEntry()) {
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry", {
                    selectedDate: this._formatDateForModel(new Date()),
                    projectId: "",
                    workType: "",
                    hours: "", // Changed from "8" to empty string
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                });
                MessageToast.show("Time entry saved. Ready for new entry.");
            }
        },

        onCancelNewEntry: function () {
            this._oAddEntryDialog.close();
        },

        onEditEntry: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();

            // Prepare edit entry data
            var oEditEntry = JSON.parse(JSON.stringify(oEntry));

            // Get project and task names
            var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                return p.projectId === oEntry.projectId;
            });
            var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                return w.type === oEntry.workType;
            });

            // Add formatted date for display
            oEditEntry.formattedDate = oModel.getProperty("/weekDates/" + this._currentEditDay + "Formatted");
            oEditEntry.projectName = oProject ? oProject.projectName : "";
            oEditEntry.taskName = oWorkType ? oWorkType.name : "";

            oModel.setProperty("/editEntry", oEditEntry);

            if (!this._oEditEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditEntryDialog = oDialog;
                    this.getView().addDependent(this._oEditEntryDialog);
                    this._oEditEntryDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading edit time entry dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oEditEntryDialog.open();
            }
        },

        onCancelEditEntry: function () {
            if (this._oEditEntryDialog) {
                this._oEditEntryDialog.close();
            }
        },

        onSaveEditedEntry: function () {
            var oModel = this.getView().getModel();
            var oEditEntry = oModel.getProperty("/editEntry");
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            if (!oEditEntry.projectId || oEditEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return;
            }
            if (!oEditEntry.workType || oEditEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return;
            }

            var totalHours = parseFloat(oEditEntry.monday || 0) +
                parseFloat(oEditEntry.tuesday || 0) +
                parseFloat(oEditEntry.wednesday || 0) +
                parseFloat(oEditEntry.thursday || 0) +
                parseFloat(oEditEntry.friday || 0) +
                parseFloat(oEditEntry.saturday || 0) +
                parseFloat(oEditEntry.sunday || 0);

            if (totalHours === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return;
            }

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEditEntry.id;
            });

            if (iIndex > -1) {
                if (aEntries[iIndex].isApproved) {
                    this._notifyManagerOfChange(aEntries[iIndex], "Time entry modified");
                }

                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oEditEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oEditEntry.workType;
                });

                oEditEntry.projectName = oProject ? oProject.projectName : "";
                oEditEntry.workTypeName = oWorkType ? oWorkType.name : "";

                Object.keys(oEditEntry).forEach(function (key) {
                    aEntries[iIndex][key] = oEditEntry[key];
                });

                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                this._persistToBackend(aEntries[iIndex])
                    .then(function () {
                        that._calculateAllTotals();
                        that._updateProjectEngagement();
                        that._updateReportsData();

                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        that._oEditEntryDialog.close();
                        MessageToast.show("Time entry updated successfully");
                    })

            }
        },

        onDeleteEntry: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext();
            if (!oContext) return;
            var oEntry = oContext.getObject();
            var that = this;

            if (oEntry.isApproved) {
                MessageBox.warning("Cannot delete approved entry. Please contact your manager.");
                return;
            }

            MessageBox.confirm("Are you sure you want to delete this time entry?", {
                title: "Delete Entry",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = that.getView().getModel();
                        var aEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            var oDeletedEntry = aEntries[iIndex];
                            aEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aEntries);

                            // Delete from backend
                            var oDataModel = that.getOwnerComponent().getModel("timesheetServiceV2");
                            if (oDataModel) {
                                oDataModel.remove("/MyTimesheets('" + oDeletedEntry.id + "')", {
                                    success: function () {
                                        that._calculateAllTotals();
                                        that._updateCounts();
                                        that._updateProjectEngagement();
                                        that._updateReportsData();

                                        var oTable = that.getView().byId("timesheetTable");
                                        if (oTable && oTable.getBinding("items")) {
                                            oTable.getBinding("items").refresh();
                                        }
                                        MessageToast.show("Time entry deleted");
                                    },
                                    error: function (oError) {
                                        MessageBox.error("Failed to delete entry from server");
                                        console.error("Error deleting entry:", oError);
                                    }
                                });
                            } else {
                                that._calculateAllTotals();
                                that._updateCounts();
                                that._updateProjectEngagement();
                                that._updateReportsData();

                                var oTable = that.getView().byId("timesheetTable");
                                if (oTable && oTable.getBinding("items")) {
                                    oTable.getBinding("items").refresh();
                                }
                                MessageToast.show("Time entry deleted");
                            }
                        }
                    }
                }
            });
        },

        onHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            this._calculateAllTotals();
            this._validateDailyHours();
        },

        _calculateAllTotals: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var fWeekTotal = 0;

            aEntries.forEach(function (oEntry) {
                fWeekTotal += parseFloat(oEntry.monday) || 0;
                fWeekTotal += parseFloat(oEntry.tuesday) || 0;
                fWeekTotal += parseFloat(oEntry.wednesday) || 0;
                fWeekTotal += parseFloat(oEntry.thursday) || 0;
                fWeekTotal += parseFloat(oEntry.friday) || 0;
                fWeekTotal += parseFloat(oEntry.saturday) || 0;
                fWeekTotal += parseFloat(oEntry.sunday) || 0;
            });

            oModel.setProperty("/totalWeekHours", fWeekTotal.toFixed(2));

            // Calculate daily totals from time entries
            var oDailyTotals = {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0
            };

            aEntries.forEach(function (oEntry) {
                oDailyTotals.monday += parseFloat(oEntry.monday) || 0;
                oDailyTotals.tuesday += parseFloat(oEntry.tuesday) || 0;
                oDailyTotals.wednesday += parseFloat(oEntry.wednesday) || 0;
                oDailyTotals.thursday += parseFloat(oEntry.thursday) || 0;
                oDailyTotals.friday += parseFloat(oEntry.friday) || 0;
                oDailyTotals.saturday += parseFloat(oEntry.saturday) || 0;
                oDailyTotals.sunday += parseFloat(oEntry.sunday) || 0;
            });

            // Update daily totals in model
            oModel.setProperty("/dailyTotals", oDailyTotals);

            this._updateProjectEngagement();
        },

        _updateProjectEngagement: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var aEngagement = [];

            aProjects.forEach(function (oProject) {
                var aProjectEntries = aEntries.filter(function (oEntry) {
                    return oEntry.projectId === oProject.projectId;
                });

                var fTotalHours = aProjectEntries.reduce(function (total, oEntry) {
                    return total + (parseFloat(oEntry.monday) || 0) +
                        (parseFloat(oEntry.tuesday) || 0) +
                        (parseFloat(oEntry.wednesday) || 0) +
                        (parseFloat(oEntry.thursday) || 0) +
                        (parseFloat(oEntry.friday) || 0) +
                        (parseFloat(oEntry.saturday) || 0) +
                        (parseFloat(oEntry.sunday) || 0);
                }, 0);

                aEngagement.push({
                    projectName: oProject.projectName,
                    managerName: oProject.managerName,
                    totalHours: fTotalHours.toFixed(2),
                    engagementDuration: this._calculateEngagementDuration(oProject.startDate, oProject.endDate),
                    status: oProject.status
                });
            }.bind(this));

            oModel.setProperty("/projectEngagement", aEngagement);
        },

        _updateReportsData: function () {
            var oModel = this.getView().getModel();
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var that = this;

            if (!oDataModel) {
                console.error("OData model not available for reports data");
                return;
            }

            BusyIndicator.show(0);

            // Read data from the new endpoints
            Promise.all([
                this._readODataEntity(oDataModel, "/BookedHoursOverview"),
                this._readODataEntity(oDataModel, "/ProjectEngagementDuration")
            ]).then(function (aResults) {
                // Debug: Log raw data to console
                console.log("Booked Hours Overview Raw Data:", aResults[0]);
                console.log("Project Engagement Duration Raw Data:", aResults[1]);

                // Process Booked Hours Overview data
                var aBookedHours = aResults[0] && aResults[0].results ? aResults[0].results :
                    (Array.isArray(aResults[0]) ? aResults[0] : []);
                var aFormattedBookedHours = aBookedHours.map(function (item) {
                    // Try multiple possible property names for project name
                    var projectName = item.ProjectName || item.projectName ||
                        item.Project || item.project ||
                        item.Name || item.name ||
                        item.project_ID || item.ProjectID ||
                        "Unknown Project";

                    return {
                        projectName: projectName,
                        allocatedHours: item.AllocatedHours || item.allocatedHours ||
                            item.Allocated_Hours || item.allocatedHours || 0,
                        bookedHours: item.BookedHours || item.bookedHours || 0,
                        remainingHours: item.RemainingHours || item.remainingHours || 0,
                        utilization: item.Utilization || item.utilization || 0
                    };
                });

                // Process Project Engagement Duration data
                var aProjectEngagement = aResults[1] && aResults[1].results ? aResults[1].results :
                    (Array.isArray(aResults[1]) ? aResults[1] : []);
                var aFormattedProjectEngagement = aProjectEngagement.map(function (item) {
                    // Try multiple possible property names for project name
                    var projectName = item.ProjectName || item.projectName ||
                        item.Project || item.project ||
                        item.Name || item.name ||
                        item.project_ID || item.ProjectID ||
                        "Unknown Project";

                    return {
                        projectName: projectName,
                        startDate: item.StartDate || item.startDate || "",
                        endDate: item.EndDate || item.endDate || "",
                        durationDays: item.DurationDays || item.durationDays || 0,
                        daysRemaining: item.DaysRemaining || item.daysRemaining || 0,
                        timelineStatus: item.TimelineStatus || item.timelineStatus || "On Track"
                    };
                });

                // Debug: Log formatted data
                console.log("Formatted Booked Hours:", aFormattedBookedHours);
                console.log("Formatted Project Engagement:", aFormattedProjectEngagement);

                // Update model properties with the new data
                oModel.setProperty("/employeeProjectHours", aFormattedBookedHours);
                oModel.setProperty("/employeeProjectDurations", aFormattedProjectEngagement);

                // Force model refresh to ensure UI updates
                oModel.refresh(true);

                BusyIndicator.hide();
            }).catch(function (oError) {
                BusyIndicator.hide();
                console.error("Error loading reports data:", oError);
                // Fallback to existing calculation if endpoints fail
                that._fallbackReportsCalculation();
            });
        },

        // Fallback method if endpoints fail
        _fallbackReportsCalculation: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var today = new Date();

            // Booked Hours Overview
            var aEmployeeProjectHours = aProjects.map(function (project) {
                var aProjectEntries = aEntries.filter(function (entry) {
                    return entry.projectId === project.projectId;
                });

                var bookedHours = aProjectEntries.reduce(function (total, entry) {
                    return total + (parseFloat(entry.monday) || 0) +
                        (parseFloat(entry.tuesday) || 0) +
                        (parseFloat(entry.wednesday) || 0) +
                        (parseFloat(entry.thursday) || 0) +
                        (parseFloat(entry.friday) || 0) +
                        (parseFloat(entry.saturday) || 0) +
                        (parseFloat(entry.sunday) || 0);
                }, 0);

                var utilization = project.allocatedHours > 0 ? Math.round((bookedHours / project.allocatedHours) * 100) : 0;

                return {
                    projectName: project.projectName || project.Project || project.Name || "Unknown Project",
                    allocatedHours: project.allocatedHours || 0,
                    bookedHours: bookedHours,
                    remainingHours: project.allocatedHours - bookedHours,
                    utilization: utilization
                };
            });

            // Project Engagement Duration
            var aEmployeeProjectDurations = aProjects.map(function (project) {
                var startDate = new Date(project.startDate);
                var endDate = new Date(project.endDate);
                var durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                var daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                var timelineStatus = project.status === "Completed" ? "Completed" :
                    project.status === "On Hold" ? "On Hold" :
                        daysRemaining < 0 ? "Delayed" :
                            daysRemaining < 14 ? "At Risk" : "On Track";

                return {
                    projectName: project.projectName || project.Project || project.Name || "Unknown Project",
                    startDate: project.startDate,
                    endDate: project.endDate,
                    durationDays: durationDays,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    timelineStatus: timelineStatus
                };
            });

            // Update model properties
            oModel.setProperty("/employeeProjectHours", aEmployeeProjectHours);
            oModel.setProperty("/employeeProjectDurations", aEmployeeProjectDurations);

            // Force model refresh to ensure UI updates
            oModel.refresh(true);
        },

        _calculateEngagementDuration: function (sStartDate, sEndDate) {
            var oStart = new Date(sStartDate);
            var oEnd = new Date(sEndDate);
            var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
                (oEnd.getMonth() - oStart.getMonth());

            if (iMonths === 0) {
                var iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24));
                return iDays + " days";
            } else if (iMonths < 12) {
                return iMonths + " months";
            } else {
                var iYears = Math.floor(iMonths / 12);
                var iRemainingMonths = iMonths % 12;
                return iYears + " year" + (iYears > 1 ? "s" : "") +
                    (iRemainingMonths > 0 ? " " + iRemainingMonths + " months" : "");
            }
        },

        _validateDailyHours: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var today = new Date();
            var aWarnings = [];

            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required)");
                }
            });

            if (aWarnings.length > 0) {
                console.warn("Hours validation warnings:", aWarnings);
            }
        },

        onProjectSelect: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (oSelectedItem) {
                var oProject = oSelectedItem.getBindingContext().getObject();
                MessageToast.show("Selected project: " + oProject.projectName + " (Manager: " + oProject.managerName + ")");
            }
        },

        onProjectChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Project changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        onWorkTypeChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Work type changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        _notifyManagerOfChange: function (oEntry, sChangeDescription) {
            MessageBox.information("Change notification sent to manager: " + sChangeDescription);
            console.log("Manager notified of change:", sChangeDescription, oEntry);
        },

        _validateTimesheet: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var aEntries = oModel.getProperty("/timeEntries");
            var bIsValid = true;
            var aWarnings = [];
            var aErrors = [];

            aEntries.forEach(function (oEntry, index) {
                if (!oEntry.projectId || oEntry.projectId.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Project is mandatory.");
                }
                if (!oEntry.workType || oEntry.workType.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Work Type is mandatory.");
                }
                if (parseFloat(oEntry.monday) === 0 && parseFloat(oEntry.tuesday) === 0 &&
                    parseFloat(oEntry.wednesday) === 0 && parseFloat(oEntry.thursday) === 0 &&
                    parseFloat(oEntry.friday) === 0 && parseFloat(oEntry.saturday) === 0 &&
                    parseFloat(oEntry.sunday) === 0) {
                    aErrors.push("Entry " + (index + 1) + ": At least one day's hours must be entered.");
                }
            });

            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required for past dates)");
                }

                if (fHours > 24) {
                    bIsValid = false;
                    aErrors.push(sDay + " has more than 24 hours. Please correct the entries.");
                    return false;
                }
            });



            if (aWarnings.length > 0) {
                MessageBox.warning(aWarnings.join("\n") + "\n\nYou can still submit, but please ensure you meet the 8-hour requirement for past dates.", {
                    title: "Validation Warnings",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.CANCEL) {
                            bIsValid = false;
                        }
                    }
                });
            }

            return bIsValid;
        },

        onViewReports: function () {
            var oModel = this.getView().getModel();
            var aEngagement = oModel.getProperty("/projectEngagement");
            var sReport = "Progress Reports:\n\n";

            aEngagement.forEach(function (oProject) {
                sReport += "Project: " + oProject.projectName + "\n";
                sReport += "Manager: " + oProject.managerName + "\n";
                sReport += "Total Hours: " + oProject.totalHours + "\n";
                sReport += "Duration: " + oProject.engagementDuration + "\n";
                sReport += "Status: " + oProject.status + "\n\n";
            });

            MessageBox.information(sReport);
        },

        onPreviousWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() - 7);
            this._updateWeekDates(mondayDate);
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));
            this._showNotification("Data sent to manager", "sap-icon://notification-2");
        },

        onCurrentWeekTS: function () {
            var today = new Date();
            this._updateWeekDates(today);
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            MessageToast.show("Navigated to current week");
        },

        onNextWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() + 7);
            this._updateWeekDates(mondayDate);
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));

            var aEntries = oModel.getProperty("/timeEntries");
            var allZeroHours = aEntries.every(function (entry) {
                return parseFloat(entry.monday) === 0 &&
                    parseFloat(entry.tuesday) === 0 &&
                    parseFloat(entry.wednesday) === 0 &&
                    parseFloat(entry.thursday) === 0 &&
                    parseFloat(entry.friday) === 0 &&
                    parseFloat(entry.saturday) === 0 &&
                    parseFloat(entry.sunday) === 0;
            });

            if (allZeroHours) {
                oModel.setProperty("/timeEntries", []);
                MessageToast.show("All entries had 0 hours. Table has been cleared.");
            } else {
                var hasLeaveEntry = aEntries.some(function (entry) {
                    return entry.workType === "LEAVE";
                });

                if (!hasLeaveEntry) {
                    var oProject = oModel.getProperty("/assignedProjects")[0];
                    if (oProject) {
                        aEntries.push({
                            id: "leave-" + Date.now(),
                            projectId: oProject.projectId,
                            projectName: oProject.projectName,
                            workType: "LEAVE",
                            workTypeName: "Leave",
                            status: "Pending",
                            monday: 0,
                            tuesday: 0,
                            wednesday: 0,
                            thursday: 0,
                            friday: 0,
                            saturday: 0,
                            sunday: 0,
                            comment: "Leave entry",
                            isApproved: false,
                            isFutureDay: false,
                            dailyComments: {
                                monday: "",
                                tuesday: "",
                                wednesday: "",
                                thursday: "",
                                friday: "",
                                saturday: "",
                                sunday: ""
                            }
                        });
                        oModel.setProperty("/timeEntries", aEntries);
                        MessageToast.show("Leave entry added for the week.");
                    }
                }
            }

            var oTable = this.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
        },

        onDatePickerChange: function (oEvent) {
            var sDate = oEvent.getParameter("value");
            if (sDate) {
                var selectedDate = new Date(sDate);
                this._updateWeekDates(selectedDate);
                MessageToast.show("Week updated for selected date: " + sDate);
            }
        },

        onPreviousWeek: function () {
            this.onPreviousWeekTS();
        },

        onNextWeek: function () {
            this.onNextWeekTS();
        },

        onToday: function () {
            this.onCurrentWeekTS();
        },

        onSettingsPress: function () {
            MessageBox.information("Timesheet Settings:\n\n- Working hours: 8 hours/day\n- Future bookings allowed for Leave/Training only\n- Manager notifications for approved entry changes");
        },

        onLogoutPress: function () {
            MessageBox.confirm("Are you sure you want to logout?", {
                title: "Logout",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        MessageToast.show("Logged out successfully");
                    }
                }
            });
        },

        _showNotification: function (sMessage, sIcon) {
            var oNotification = new sap.m.Dialog({
                title: "Notification",
                icon: sIcon || "sap-icon://notification-2",
                content: new sap.m.Text({
                    text: sMessage
                }),
                beginButton: new sap.m.Button({
                    text: "OK",
                    press: function () {
                        oNotification.close();
                    }
                }),
                afterClose: function () {
                    oNotification.destroy();
                }
            });

            oNotification.addStyleClass("amazonNotification");
            oNotification.open();
        },

        // Day overflow functionality
        onDayOverflowPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var sDay = oButton.data("day");
            var oContext = oButton.getBindingContext();
            if (!oContext) {
                MessageToast.show("Unable to get entry data");
                return;
            }

            var oEntry = oContext.getObject();
            this._currentEditEntry = oEntry;
            this._currentEditDay = sDay;

            if (!this._oDayOverflowMenu) {
                this._oDayOverflowMenu = new Menu({
                    items: [
                        new MenuItem({
                            text: "Edit",
                            icon: "sap-icon://edit",
                            press: this.onEditDayHours.bind(this)
                        }),
                        new MenuItem({
                            text: "Delete",
                            icon: "sap-icon://delete",
                            press: this.onDeleteDayHours.bind(this)
                        })
                    ]
                });
                this.getView().addDependent(this._oDayOverflowMenu);
            }

            this._oDayOverflowMenu.openBy(oButton);
        },

        onEditDayHours: function () {
            var oEntry = this._currentEditEntry;
            var sDay = this._currentEditDay;

            if (!oEntry || !sDay) {
                MessageToast.show("Unable to edit. Please try again.");
                return;
            }

            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var sFormattedDate = oWeekDates[sDay + "Formatted"];
            var fCurrentHours = parseFloat(oEntry[sDay]) || 0;
            var sCurrentComment = (oEntry.dailyComments && oEntry.dailyComments[sDay]) ? oEntry.dailyComments[sDay] : "";

            // Create hour options for dropdown
            var aHourOptions = [];
            for (var i = 0; i <= 24; i += 0.5) {
                aHourOptions.push(new Item({
                    key: i.toString(),
                    text: i + " hours"
                }));
            }

            // Create the dialog
            var oDialog = new Dialog({
                title: "Edit Hours & Comment - " + this._capitalize(sDay),
                contentWidth: "500px",
                content: [
                    new VBox({
                        items: [
                            // Activity Date (non-editable)
                            new Label({
                                text: "Activity Date:"
                            }).addStyleClass("sapUiSmallMarginTop"),
                            new Input({
                                value: sFormattedDate,
                                editable: false,
                                width: "100%"
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Project (non-editable)
                            new Label({
                                text: "Project:"
                            }),
                            new Input({
                                value: oEntry.projectName,
                                editable: false,
                                width: "100%"
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Task (non-editable)
                            new Label({
                                text: "Task:"
                            }),
                            new Input({
                                value: oEntry.workTypeName,
                                editable: false,
                                width: "100%"
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Hours (editable dropdown)
                            new Label({
                                text: "Hours:"
                            }),
                            new ComboBox({
                                placeholder: "Select hours",
                                selectedKey: fCurrentHours.toString(),
                                items: aHourOptions,
                                width: "100%"
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Daily Comment (editable text area)
                            new Label({
                                text: "Daily Comment:"
                            }),
                            new TextArea({
                                placeholder: "Enter comment for " + this._capitalize(sDay),
                                value: sCurrentComment,
                                width: "100%",
                                rows: 4,
                                liveChange: function (oEvent) {
                                    // Store the comment value for saving
                                    this._currentDailyComment = oEvent.getParameter("value");
                                }.bind(this)
                            }).addStyleClass("sapUiTinyMarginBottom")
                        ]
                    })
                ],
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: function () {
                        var oHoursCombo = oDialog.getContent()[0].getItems()[7]; // Hours ComboBox
                        var fNewHours = parseFloat(oHoursCombo.getSelectedKey());
                        var sDailyComment = this._currentDailyComment || sCurrentComment;

                        if (isNaN(fNewHours) || fNewHours < 0 || fNewHours > 24) {
                            MessageBox.error("Please select a valid hours value between 0 and 24");
                            return;
                        }

                        this._saveEditedDayHoursAuto(oEntry, sDay, fNewHours, sDailyComment);
                        oDialog.close();
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            this.getView().addDependent(oDialog);
            oDialog.open();
        },


        _saveEditedDayHoursAuto: function (oEntry, sDay, fNewHours, sDailyComment) {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEntry.id;
            });

            if (iIndex === -1) {
                MessageBox.error("Entry not found");
                return;
            }

            // Update hours and daily comment
            aEntries[iIndex][sDay] = fNewHours;

            // Ensure dailyComments object exists
            if (!aEntries[iIndex].dailyComments) {
                aEntries[iIndex].dailyComments = {};
            }

            // Update the daily comment for the specific day
            aEntries[iIndex].dailyComments[sDay] = sDailyComment;

            if (aEntries[iIndex].isApproved) {
                this._notifyManagerOfChange(
                    aEntries[iIndex],
                    "Hours and comment updated for " + this._capitalize(sDay) +
                    " (hours: " + oEntry[sDay] + " → " + fNewHours + ")"
                );
            }

            oModel.setProperty("/timeEntries", aEntries);

            // Save to backend
            Promise.resolve(this._persistToBackend(aEntries))
                .then(function () {
                    // Recalculate totals
                    that._calculateAllTotals();

                    // Refresh table
                    var oTable = that.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }

                    // Show success message
                    MessageToast.show(
                        that._capitalize(sDay) + " hours and comment updated successfully for " + oEntry.projectName
                    );
                })
                .catch(function (oError) {
                    MessageBox.error("Failed to save changes to server");
                    console.error("Error saving edited hours and comment:", oError);
                });
        },



        onDeleteDayHours: function () {
            var oEntry = this._currentEditEntry;
            var sDay = this._currentEditDay;

            if (!oEntry || !sDay) {
                MessageToast.show("Unable to delete. Please try again.");
                return;
            }

            var fCurrentHours = parseFloat(oEntry[sDay]) || 0;

            MessageBox.confirm(
                "Delete " + fCurrentHours.toFixed(2) + " hours for " +
                this._capitalize(sDay) + "?\n\nProject: " + oEntry.projectName +
                "\nWork Type: " + oEntry.workTypeName,
                {
                    title: "Confirm Deletion",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteHoursAuto(oEntry, sDay);
                        }
                    }.bind(this)
                }
            );
        },

        _deleteHoursAuto: function (oEntry, sDay) {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEntry.id;
            });

            if (iIndex === -1) {
                MessageBox.error("Entry not found");
                return;
            }

            var fOldHours = aEntries[iIndex][sDay];
            aEntries[iIndex][sDay] = 0;

            if (aEntries[iIndex].isApproved) {
                this._notifyManagerOfChange(
                    aEntries[iIndex],
                    "Hours deleted for " + this._capitalize(sDay) +
                    " (was " + fOldHours + " hours)"
                );
            }

            oModel.setProperty("/timeEntries", aEntries);

            // Save to backend
            // this._persistToBackend(aEntries[iIndex])
            // .then(function () {
            //     that._calculateAllTotals();

            //     var oTable = that.getView().byId("timesheetTable");
            //     if (oTable && oTable.getBinding("items")) {
            //         oTable.getBinding("items").refresh();
            //     }

            //     MessageToast.show(
            //         that._capitalize(sDay) + " hours deleted for " + oEntry.projectName
            //     );
            // })

            // .catch(function (oError) {
            //     MessageBox.error("Failed to delete hours from server");
            //     console.error("Error deleting hours:", oError);
            // });
        },

        _persistToBackend: function (sActionType) {
            var oView = this.getView();
            var oDialog = oView.byId("addEntryDialog") || sap.ui.getCore().byId("addEntryDialog");
            var oModel = this.getView().getModel("timesheetServiceV2"); // use correct model

            if (!oDialog) {
                sap.m.MessageBox.error("Add Entry Dialog not found.");
                return;
            }

            // ✅ Get control references from fragment (using sap.ui.getCore())
            var oDatePicker = sap.ui.getCore().byId("entryDatePicker");
            var oProjectCombo = sap.ui.getCore().byId("projectComboBox");
            var oWorkTypeCombo = sap.ui.getCore().byId("workTypeComboBox");
            var oTaskInput = sap.ui.getCore().byId("taskDetailsInput");
            var oHoursCombo = sap.ui.getCore().byId("hoursComboBox");

            // ✅ Check if controls exist
            if (!oDatePicker || !oProjectCombo || !oWorkTypeCombo || !oTaskInput || !oHoursCombo) {
                sap.m.MessageToast.show("Some input fields are missing in the dialog.");
                return;
            }

            // ✅ Get actual values
            var sDate = oDatePicker.getDateValue(); // returns JS Date object
            var sProjectId = oProjectCombo.getSelectedKey();
            var sWorkType = oWorkTypeCombo.getSelectedKey();
            var sTaskDetails = oTaskInput.getValue();
            var sHours = oHoursCombo.getSelectedKey();

            // ✅ Basic validation
            if (!sDate || !sProjectId || !sWorkType || !sHours || !sTaskDetails) {
                sap.m.MessageToast.show("Please fill in all mandatory fields.");
                return;
            }

            // ✅ Determine status based on action type
            var sStatus = sActionType === "submit" ? "Submitted" : "Draft";

            // ✅ Build payload (now correctly converting Date to YYYY-MM-DD)
            var oPayload = {
                workDate: sDate.toISOString().split("T")[0],
                project_ID: sProjectId,
                hoursWorked: parseFloat(sHours),
                task: sWorkType,
                taskDetails: sTaskDetails,
                status: sStatus,
                isBillable: true
            };

            sap.ui.core.BusyIndicator.show(0);

            // ✅ Create entry in backend
            oModel.create("/Timesheets", oPayload, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    var sMsg = sStatus === "Submitted"
                        ? "Time entry submitted successfully!"
                        : "Time entry saved as draft successfully!";
                    sap.m.MessageToast.show(sMsg);
                    oModel.refresh(true);
                    oDialog.close();
                },
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to save entry. Please try again.");
                    console.error(oError);
                }
            });
        },

        _persistToBackendoo: function (oEntry, sStatus) {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");


            if (!oDataModel) {
                console.warn("OData model not available for persistence");
                return Promise.reject("OData model not available");
            }

            // Get current profile for employee ID
            var oProfile = this.getView().getModel().getProperty("/profile");
            // var semployee_ID = oProfile.employee_ID;

            // if (!semployee_ID) {
            //     console.warn("Employee ID not found in profile");
            //     return Promise.reject("Employee ID not available");
            // }

            // Construct data payload expected by backend - FIXED to match OData entity properties
            // var oData = {
            //     // employee_ID: semployee_ID,
            //     ProjectID: oEntry.projectId,
            //     ActivityID: oEntry.workType,
            //     WorkDate: this._getCurrentWeekMonday(),
            //     Task: oEntry.workTypeName || "General Task",
            //     TaskDetails: oEntry.comment || "",
            //     HoursWorked: this._calculateTotalHours(oEntry),
            //     Monday: parseFloat(oEntry.monday) || 0,
            //     Tuesday: parseFloat(oEntry.tuesday) || 0,
            //     Wednesday: parseFloat(oEntry.wednesday) || 0,
            //     Thursday: parseFloat(oEntry.thursday) || 0,
            //     Friday: parseFloat(oEntry.friday) || 0,
            //     Saturday: parseFloat(oEntry.saturday) || 0,
            //     Sunday: parseFloat(oEntry.sunday) || 0,
            //     Status: sStatus || oEntry.status || "Draft",
            //     IsBillable: true
            // };

            // Add ID for updates
            if (oEntry.id && !oEntry.id.startsWith("temp")) {
                oData.ID = oEntry.id;
            }

            console.log("📤 Final Payload Sent to Backend:",);

            // Promise-based backend persistence
            return new Promise(function (resolve, reject) {
                if (!oEntry.id || oEntry.id.startsWith("temp") || oEntry.id.startsWith("leave-")) {
                    // CREATE new record
                    oDataModel.create("/MyTimesheets", {
                        success: function (oResponse) {
                            console.log("✅ Successfully created entry:", oResponse);
                            resolve(oResponse);
                        },
                        error: function (oError) {
                            console.error("❌ Error creating entry:", oError);
                            reject(oError);
                        }
                    });
                } else {
                    // UPDATE existing record
                    var sPath = "/MyTimesheets('" + oEntry.id + "')";
                    oDataModel.update(sPath, oData, {
                        success: function (oResponse) {
                            console.log("✅ Successfully updated entry:", oResponse);
                            resolve(oResponse);
                        },
                        error: function (oError) {
                            console.error("❌ Error updating entry:", oError);
                            reject(oError);
                        }
                    });
                }
            });
        },

        _getCurrentWeekMonday: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            return oWeekDates.monday;
        },

        _calculateTotalHours: function (oEntry) {
            return (parseFloat(oEntry.monday) || 0) +
                (parseFloat(oEntry.tuesday) || 0) +
                (parseFloat(oEntry.wednesday) || 0) +
                (parseFloat(oEntry.thursday) || 0) +
                (parseFloat(oEntry.friday) || 0) +
                (parseFloat(oEntry.saturday) || 0) +
                (parseFloat(oEntry.sunday) || 0);
        },

        _capitalize: function (str) {
            if (!str) return "";
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        // Profile functionality
        onProfilePress: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var oViewModel = this.getView().getModel();

            if (!oDataModel) {
                MessageBox.error("OData model not found. Please check your manifest configuration.");
                return;
            }

            BusyIndicator.show(0);

            // First check if we already have profile data in the model
            // var oExistingProfile = oViewModel.getProperty("/profile");
            // if (oExistingProfile && oExistingProfile.employee_ID) {
            //     BusyIndicator.hide();
            //     this._openProfileDialog();
            //     return;
            // }

            // If not, load it from the backend
            oDataModel.read("/MyProfile", {
                success: function (oData) {
                    BusyIndicator.hide();

                    // Format profile data
                    var oProfile = {
                        // employee_ID: oData.employee_ID || oData.employee_ID || "",
                        firstName: oData.FirstName || oData.firstName || "",
                        lastName: oData.LastName || oData.lastName || "",
                        email: oData.Email || oData.email || "",
                        managerName: oData.ManagerName || oData.managerName || "",
                        managerEmail: oData.ManagerEmail || oData.managerEmail || "",
                        activeStatus: oData.ActiveStatus || oData.activeStatus || "",
                        changedBy: oData.ChangedBy || oData.changedBy || "",
                        userRole: oData.UserRole || oData.userRole || ""
                    };

                    oViewModel.setProperty("/profile", oProfile);

                    // Set employee name in the page header if available
                    var sEmployeeName = oProfile.firstName + " " + oProfile.lastName;
                    var oEmployeeNameText = this.getView().byId("employeeNameText");
                    if (oEmployeeNameText) {
                        oEmployeeNameText.setText(sEmployeeName);
                    }

                    this._openProfileDialog();
                }.bind(this),
                error: function (oError) {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to load profile data. Please try again later.");
                    console.error("Error loading profile:", oError);
                }
            });
        },

        _openProfileDialog: function () {
            if (!this._oProfileDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.ProfileDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(this._oProfileDialog);
                    this._oProfileDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading profile dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oProfileDialog.open();
            }
        },

        onCloseProfileDialog: function () {
            if (this._oProfileDialog) {
                this._oProfileDialog.close();
            }
        },

        // Function to validate daily hours with backend
        _validateDailyHoursWithBackend: function (sDate) {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");

            if (!oDataModel) {
                return Promise.reject("OData model not available");
            }

            return new Promise(function (resolve, reject) {
                oDataModel.callFunction("/validateDailyHours", {
                    method: "GET",
                    urlParameters: {
                        "date": sDate
                    },
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        }
    });
});



UPDATED CODE 2

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/type/Float",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/m/Input",
    "sap/m/Button",
    "sap/ui/core/Item",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/m/DateRangeSelection",
    "sap/m/CheckBox",
    "sap/m/TextArea",
    "sap/m/SegmentedButton",
    "sap/m/SegmentedButtonItem",
    "sap/m/Popover",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/ObjectStatus",
    "sap/m/Text",
    "sap/m/ToolbarSpacer",
    "sap/m/OverflowToolbar",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Menu",
    "sap/m/MenuItem",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageBox, MessageToast, JSONModel, FloatType, Dialog, VBox, Label,
    ComboBox, Input, Button, Item, History, Fragment, DateRangeSelection, CheckBox, TextArea,
    SegmentedButton, SegmentedButtonItem, Popover, List, StandardListItem, ObjectStatus,
    Text, ToolbarSpacer, OverflowToolbar, Table, Column, ColumnListItem, Menu, MenuItem, BusyIndicator) {
    "use strict";

    return Controller.extend("admin.com.admin.controller.Employee", {
        onInit: function () {
            this._initializeModel();
            this._initializeCurrentWeek();
            this._loadData();
            this._oRouter = this.getOwnerComponent().getRouter();
            if (!this._oRouter) {
                this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            }

            // Attach route matched event to reload data when navigating back
            this._oRouter.getRoute("employee").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Reload data every time the route is matched
            this._loadData();
        },

        // Formatter function to calculate row total
        formatRowTotal: function (monday, tuesday, wednesday, thursday, friday, saturday, sunday) {
            var total = (parseFloat(monday) || 0) +
                (parseFloat(tuesday) || 0) +
                (parseFloat(wednesday) || 0) +
                (parseFloat(thursday) || 0) +
                (parseFloat(friday) || 0) +
                (parseFloat(saturday) || 0) +
                (parseFloat(sunday) || 0);
            return total.toFixed(2);
        },

        // Format day with date
        formatDayWithDate: function (day, formattedDate) {
            return day + " (" + formattedDate + ")";
        },

        _initializeModel: function () {
            var oModel = new JSONModel({
                currentWeek: "",
                totalWeekHours: "0.00",
                isSubmitted: false,
                timeEntriesCount: "0",
                commentsCount: "0",
                selectedDate: null,
                isCurrentWeek: true,
                assignedProjects: [],
                availableActivities: [],
                nonProjectTypes: [],
                workTypes: [
                    { type: "DESIGN", name: "Designing" },
                    { type: "DEVELOP", name: "Developing" },
                    { type: "TEST", name: "Testing" },
                    { type: "DEPLOY", name: "Deployment" },
                    { type: "MEETING", name: "Meetings" },
                    { type: "DOCUMENTATION", name: "Documentation" },
                    { type: "LEAVE", name: "Leave" },
                    { type: "TRAINING", name: "Trainings" }
                ],
                timeEntries: [],
                dailyTotals: {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                },
                dailyTotalsArray: [],
                dailyComments: [
                    { day: "monday", comment: "", lastUpdated: "" },
                    { day: "Tuesday", comment: "", lastUpdated: "" },
                    { day: "Wednesday", comment: "", lastUpdated: "" },
                    { day: "Thursday", comment: "", lastUpdated: "" },
                    { day: "Friday", comment: "", lastUpdated: "" },
                    { day: "Saturday", comment: "", lastUpdated: "" },
                    { day: "Sunday", comment: "", lastUpdated: "" }
                ],
                projectEngagement: [],
                weekDates: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: "",
                    mondayFormatted: "",
                    tuesdayFormatted: "",
                    wednesdayFormatted: "",
                    thursdayFormatted: "",
                    fridayFormatted: "",
                    saturdayFormatted: "",
                    sundayFormatted: ""
                },
                editEntry: {},
                newEntry: {
                    selectedDate: "",
                    projectId: "",
                    workType: "",
                    hours: "8",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                },
                newDailyComment: {
                    day: "",
                    comment: ""
                },
                employeeProjectHours: [],
                employeeProjectDurations: [],
                currentMonth: "",
                projects: [],
                selectedProject: "",
                dueDateStart: null,
                dueDateEnd: null,
                selectedWorkType: "DESIGN",
                statusOptions: [
                    { key: "todo", text: "To Do" },
                    { key: "inprogress", text: "In Progress" },
                    { key: "done", text: "Done" },
                    { key: "review", text: "Under Review" }
                ],
                selectedStatus: "todo",
                priorityOptions: [
                    { key: "low", text: "Low" },
                    { key: "medium", text: "Medium" },
                    { key: "high", text: "High" },
                    { key: "urgent", text: "Urgent" }
                ],
                selectedPriority: "medium",
                needInput: false,
                newCommentText: "",
                existingComments: [],
                editCommentText: "",
                editCommentId: "",
                editDayHours: {
                    day: "",
                    hours: 0,
                    entryId: "",
                    dayProperty: ""
                },
                profile: {
                    employee_ID: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    managerName: "",
                    managerEmail: "",
                    activeStatus: "",
                    changedBy: "",
                    userRole: ""
                },
                dailySummary: []
            });
            this.getView().setModel(oModel);
        },

        _loadData: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var that = this;
            var oViewModel = this.getView().getModel();

            // Show loading indicator
            BusyIndicator.show(0);

            Promise.all([
                this._readODataEntity(oDataModel, "/MyProfile"),
                this._readODataEntity(oDataModel, "/MyProjects"),
                this._readODataEntity(oDataModel, "/MyTimesheets"),
                this._readODataEntity(oDataModel, "/AvailableActivities"),
                this._readODataEntity(oDataModel, "/AvailableNonProjectTypes"),
                this._readODataEntity(oDataModel, "/MyDailySummary")
            ]).then(function (aResults) {
                // Process profile data
                var oProfileData = aResults[0];
                if (oProfileData) {
                    var oProfile = {
                        // employee_ID: oProfileData.employee_ID || oProfileData.employee_ID || "",
                        firstName: oProfileData.FirstName || oProfileData.firstName || "",
                        lastName: oProfileData.LastName || oProfileData.lastName || "",
                        email: oProfileData.Email || oProfileData.email || "",
                        managerName: oProfileData.ManagerName || oProfileData.managerName || "",
                        managerEmail: oProfileData.ManagerEmail || oProfileData.managerEmail || "",
                        activeStatus: oProfileData.ActiveStatus || oProfileData.activeStatus || "",
                        changedBy: oProfileData.ChangedBy || oProfileData.changedBy || "",
                        userRole: oProfileData.UserRole || oProfileData.userRole || ""
                    };
                    oViewModel.setProperty("/profile", oProfile);

                    // Set employee name in the page header if available
                    var sEmployeeName = oProfile.firstName + " " + oProfile.lastName;
                    var oEmployeeNameText = that.getView().byId("employeeNameText");
                    if (oEmployeeNameText) {
                        oEmployeeNameText.setText(sEmployeeName);
                    }
                }

                // Process projects data - enhanced to match your image structure
                var aProjects = aResults[1] && aResults[1].value ? aResults[1].value : (aResults[1] && aResults[1].results ? aResults[1].results : []);
                var aFormattedProjects = aProjects.map(function (project) {
                    return {
                        projectId: project.projectID || project.projectId || project.ID || project.project_ID,
                        projectCode: project.projectCode || project.code || "",
                        projectName: project.Project || project.projectName || project.Name || project.projectName,
                        managerName: project.managerName || project.Manager || project.Manager_Name || "Not Assigned",
                        status: project.status || project.Status || "Active",
                        startDate: project.StartDate || project.startDate || project.Start_Date,
                        endDate: project.EndDate || project.endDate || project.End_Date,
                        allocatedHours: project.AllocateHours || project.allocatedHours || project.Allocated_Hours || 0,
                        bookedHours: project.BookedHours || project.bookedHours || 0,
                        remainingHours: project.RemainingHours || project.remainingHours || 0,
                        utilization: project.Utilization || project.utilization || 0,
                        duration: project.Duration || project.duration || 0,
                        daysRemaining: project.DaysRemaining || project.daysRemaining || 0,
                        timelineStatus: project.TimelineStatus || project.timelineStatus || "Active"
                    };
                });

                oViewModel.setProperty("/assignedProjects", aFormattedProjects);
                oViewModel.setProperty("/projects", aFormattedProjects.map(function (p) {
                    return {
                        id: p.projectId,
                        name: p.projectName,
                        code: p.projectCode
                    };
                }));

                if (aFormattedProjects.length > 0) {
                    oViewModel.setProperty("/selectedProject", aFormattedProjects[0].projectId);
                }

                // Process available activities
                var aAvailableActivities = aResults[3] && aResults[3].results ? aResults[3].results : [];
                var aFormattedActivities = aAvailableActivities.map(function (activity) {
                    return {
                        activityId: activity.activityId || activity.ID,
                        activityName: activity.activityName || activity.Name,
                        description: activity.description || activity.Description
                    };
                });
                oViewModel.setProperty("/availableActivities", aFormattedActivities);

                var aNonProjectTypes = aResults[4] && aResults[4].results ? aResults[4].results : [];
                var aFormattedNonProjectTypes = aNonProjectTypes.map(function (type) {
                    return {
                        typeId: type.typeId || type.ID,
                        typeName: type.typeName || type.Name,
                        description: type.description || type.Description
                    };
                });
                oViewModel.setProperty("/nonProjectTypes", aFormattedNonProjectTypes);

                // Process timesheets data
                var aTimesheets = aResults[2] && aResults[2].results ? aResults[2].results : [];
                var aFormattedTimesheets = aTimesheets.map(function (timesheet) {
                    var oDayHours = {
                        monday: parseFloat(timesheet.monday || timesheet.Monday || 0),
                        tuesday: parseFloat(timesheet.tuesday || timesheet.Tuesday || 0),
                        wednesday: parseFloat(timesheet.wednesday || timesheet.Wednesday || 0),
                        thursday: parseFloat(timesheet.thursday || timesheet.Thursday || 0),
                        friday: parseFloat(timesheet.friday || timesheet.Friday || 0),
                        saturday: parseFloat(timesheet.saturday || timesheet.Saturday || 0),
                        sunday: parseFloat(timesheet.sunday || timesheet.Sunday || 0)
                    };

                    return {
                        id: timesheet.id || timesheet.ID,
                        projectId: timesheet.projectId || timesheet.project_ID || timesheet.projectID,
                        projectName: timesheet.projectName || "",
                        workTypeName: timesheet.activity || timesheet.task || timesheet.workTypeName,
                        workType: that._mapActivityToWorkType(timesheet.activity || timesheet.task || timesheet.workTypeName),
                        comment: timesheet.taskDetails || timesheet.comment || timesheet.Description || "",
                        status: timesheet.status || timesheet.Status || "Pending",
                        isApproved: (timesheet.status === "Approved") || (timesheet.Status === "Approved") || false,
                        isFutureDay: false,
                        dailyComments: {
                            monday: timesheet.mondayComment || timesheet.monday_Comment || "",
                            tuesday: timesheet.tuesdayComment || timesheet.Tuesday_Comment || "",
                            wednesday: timesheet.wednesdayComment || timesheet.Wednesday_Comment || "",
                            thursday: timesheet.thursdayComment || timesheet.Thursday_Comment || "",
                            friday: timesheet.fridayComment || timesheet.Friday_Comment || "",
                            saturday: timesheet.saturdayComment || timesheet.Saturday_Comment || "",
                            sunday: timesheet.sundayComment || timesheet.Sunday_Comment || ""
                        },
                        ...oDayHours
                    };
                });

                oViewModel.setProperty("/timeEntries", aFormattedTimesheets);

                // Process daily summary data
                var aDailySummary = aResults[5] && aResults[5].results ? aResults[5].results : [];
                var oDailyTotals = {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                };

                // Calculate daily totals from time entries
                aFormattedTimesheets.forEach(function (entry) {
                    oDailyTotals.monday += parseFloat(entry.monday) || 0;
                    oDailyTotals.tuesday += parseFloat(entry.tuesday) || 0;
                    oDailyTotals.wednesday += parseFloat(entry.wednesday) || 0;
                    oDailyTotals.thursday += parseFloat(entry.thursday) || 0;
                    oDailyTotals.friday += parseFloat(entry.friday) || 0;
                    oDailyTotals.saturday += parseFloat(entry.saturday) || 0;
                    oDailyTotals.sunday += parseFloat(entry.sunday) || 0;
                });

                oViewModel.setProperty("/dailyTotals", oDailyTotals);
                oViewModel.setProperty("/dailySummary", aDailySummary);

                // Check if timesheet is submitted
                var bIsSubmitted = aFormattedTimesheets.length > 0 &&
                    aFormattedTimesheets.every(function (entry) {
                        return entry.status === "Submitted" || entry.status === "Approved";
                    });
                oViewModel.setProperty("/isSubmitted", bIsSubmitted);

                that._calculateAllTotals();
                that._updateCounts();
                that._updateProjectEngagement();
                that._updateReportsData();

                // Force refresh to ensure UI updates
                oViewModel.refresh(true);

                // Hide loading indicator
                BusyIndicator.hide();

                // Show success message
                MessageToast.show("Timesheet data loaded successfully");
            }).catch(function (oError) {
                BusyIndicator.hide();
                MessageBox.error("Failed to load timesheet data");
                console.error("Error loading data:", oError);
            });
        },

        _readODataEntity: function (oModel, sPath) {
            return new Promise(function (resolve, reject) {
                oModel.read(sPath, {
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        console.warn("Error reading " + sPath + ":", oError);
                        resolve({}); // Resolve with empty object instead of rejecting
                    }
                });
            });
        },

        _mapActivityToWorkType: function (activity) {
            var activityMap = {
                "Designing": "DESIGN",
                "Developing": "DEVELOP",
                "Testing": "TEST",
                "Deployment": "DEPLOY",
                "Meetings": "MEETING",
                "Documentation": "DOCUMENTATION",
                "Leave": "LEAVE",
                "Training": "TRAINING"
            };

            return activityMap[activity] || "DEVELOP";
        },

        _initializeCurrentWeek: function () {
            var today = new Date();
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            oModel.setProperty("/isCurrentWeek", true);
            this._updateWeekDates(today);

            var months = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            oModel.setProperty("/currentMonth", months[today.getMonth()] + " " + today.getFullYear());
        },

        _updateWeekDates: function (oDate) {
            var oModel = this.getView().getModel();
            var startDate = new Date(oDate);
            var day = startDate.getDay();
            var diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            var monday = new Date(startDate.setDate(diff));
            var tuesday = new Date(monday);
            tuesday.setDate(monday.getDate() + 1);
            var wednesday = new Date(monday);
            wednesday.setDate(monday.getDate() + 2);
            var thursday = new Date(monday);
            thursday.setDate(monday.getDate() + 3);
            var friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            var saturday = new Date(monday);
            saturday.setDate(monday.getDate() + 5);
            var sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            var oWeekDates = {
                monday: this._formatDateForModel(monday),
                tuesday: this._formatDateForModel(tuesday),
                wednesday: this._formatDateForModel(wednesday),
                thursday: this._formatDateForModel(thursday),
                friday: this._formatDateForModel(friday),
                saturday: this._formatDateForModel(saturday),
                sunday: this._formatDateForModel(sunday),
                mondayFormatted: this._formatDateDisplay(monday),
                tuesdayFormatted: this._formatDateDisplay(tuesday),
                wednesdayFormatted: this._formatDateDisplay(wednesday),
                thursdayFormatted: this._formatDateDisplay(thursday),
                fridayFormatted: this._formatDateDisplay(friday),
                saturdayFormatted: this._formatDateDisplay(saturday),
                sundayFormatted: this._formatDateDisplay(sunday)
            };
            var sCurrentWeek = this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday) + " " + sunday.getFullYear();
            oModel.setProperty("/weekDates", oWeekDates);
            oModel.setProperty("/currentWeek", sCurrentWeek);

            var today = new Date();
            var isCurrentWeek = today >= monday && today <= sunday;
            oModel.setProperty("/isCurrentWeek", isCurrentWeek);

            Object.keys(oWeekDates).forEach(function (sDay) {
                if (sDay.endsWith("Formatted")) return;
                var dayDate = new Date(oWeekDates[sDay]);
                var isFuture = dayDate > today;
                oWeekDates[sDay + "IsFuture"] = isFuture;
            });
            oModel.setProperty("/weekDates", oWeekDates);
        },

        _formatDateForModel: function (oDate) {
            return oDate.getFullYear() + "-" +
                ("0" + (oDate.getMonth() + 1)).slice(-2) + "-" +
                ("0" + oDate.getDate()).slice(-2);
        },

        _formatDateDisplay: function (oDate) {
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[oDate.getMonth()] + " " + ("0" + oDate.getDate()).slice(-2);
        },

        _updateCounts: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aComments = oModel.getProperty("/dailyComments");
            var iCommentsWithText = aComments.filter(function (comment) {
                return comment.comment && comment.comment.trim() !== "";
            }).length;
            oModel.setProperty("/timeEntriesCount", aEntries.length.toString());
            oModel.setProperty("/commentsCount", iCommentsWithText.toString());
        },

        onTaskDetailPress: function (oEvent) {
            try {
                var oButton = oEvent.getSource();
                var oContext = oButton.getBindingContext("view") || oButton.getBindingContext();

                if (!oContext) {
                    sap.m.MessageToast.show("No data context found for this task.");
                    return;
                }

                var oEntry = oContext.getObject();
                if (!oEntry) {
                    sap.m.MessageToast.show("No task details available.");
                    return;
                }

                var oViewModel = this.getView().getModel("view") || this.getView().getModel();
                var oWeekDates = oViewModel.getProperty("/weekDates") || {};

                // Ensure dailyComments exists
                oEntry.dailyComments = oEntry.dailyComments || {};

                var aDays = [
                    { day: "Monday", date: oWeekDates.mondayFormatted, hours: oEntry.monday, comment: oEntry.dailyComments.monday },
                    { day: "Tuesday", date: oWeekDates.tuesdayFormatted, hours: oEntry.tuesday, comment: oEntry.dailyComments.tuesday },
                    { day: "Wednesday", date: oWeekDates.wednesdayFormatted, hours: oEntry.wednesday, comment: oEntry.dailyComments.wednesday },
                    { day: "Thursday", date: oWeekDates.thursdayFormatted, hours: oEntry.thursday, comment: oEntry.dailyComments.thursday },
                    { day: "Friday", date: oWeekDates.fridayFormatted, hours: oEntry.friday, comment: oEntry.dailyComments.friday },
                    { day: "Saturday", date: oWeekDates.saturdayFormatted, hours: oEntry.saturday, comment: oEntry.dailyComments.saturday },
                    { day: "Sunday", date: oWeekDates.sundayFormatted, hours: oEntry.sunday, comment: oEntry.dailyComments.sunday }
                ].filter(function (oDay) {
                    return parseFloat(oDay.hours) > 0;
                });

                var oList = new sap.m.List({
                    headerText: "Hours Worked",
                    items: aDays.map(function (oDay) {
                        return new sap.m.StandardListItem({
                            title: oDay.day + " (" + (oDay.date || "") + ")",
                            info: (oDay.hours || 0) + " hrs",
                            description: oDay.comment || "",
                            infoState: parseFloat(oDay.hours) >= 8 ? sap.ui.core.ValueState.Success : sap.ui.core.ValueState.Warning
                        });
                    })
                });

                var oPopover = new sap.m.Popover({
                    title: "Task Details",
                    placement: sap.m.PlacementType.Auto,
                    contentWidth: "300px",
                    content: [
                        new sap.m.Text({
                            text: oEntry.comment || "No task details provided."
                        }).addStyleClass("sapUiTinyMarginBottom"),
                        oList
                    ],
                    endButton: new sap.m.Button({
                        text: "Close",
                        type: "Emphasized",
                        press: function () {
                            oPopover.close();
                        }
                    })
                });

                this.getView().addDependent(oPopover);
                oPopover.openBy(oButton);

            } catch (err) {
                console.error("Error in onTaskDetailPress:", err);
                sap.m.MessageBox.error("Unable to open task details: " + err.message);
            }
        },



        onInfoPress: function () {
            if (!this._oCommentOptionsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.CommentOptions",
                    controller: this
                }).then(function (oDialog) {
                    this._oCommentOptionsDialog = oDialog;
                    this.getView().addDependent(this._oCommentOptionsDialog);
                    this._initializeCommentData();
                    this._oCommentOptionsDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading comment dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._initializeCommentData();
                this._oCommentOptionsDialog.open();
            }
        },

        _initializeCommentData: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentCommentType", "daily");
            oModel.setProperty("/selectedDay", "monday");
            oModel.setProperty("/dailyCommentText", "");
            oModel.setProperty("/weeklyCommentText", "");
            oModel.setProperty("/monthlyCommentText", "");
            oModel.setProperty("/newCommentText", "");
            oModel.setProperty("/needInput", false);

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            if (aProjects && aProjects.length > 0) {
                oModel.setProperty("/selectedProject", aProjects[0].id);
            }
            if (aWorkTypes && aWorkTypes.length > 0) {
                oModel.setProperty("/selectedWorkType", aWorkTypes[0].type);
            }
            oModel.setProperty("/selectedStatus", "todo");
            oModel.setProperty("/selectedPriority", "medium");

            var today = new Date();
            var todayStr = today.getFullYear() + "-" +
                ("0" + (today.getMonth() + 1)).slice(-2) + "-" +
                ("0" + today.getDate()).slice(-2);
            oModel.setProperty("/dueDateStart", todayStr);
            oModel.setProperty("/dueDateEnd", todayStr);
        },

        onCommentTypeSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentCommentType", sKey);
            MessageToast.show("Switched to " + sKey + " comments");
        },

        onAddNewComment: function () {
            var oModel = this.getView().getModel();
            var sNewComment = oModel.getProperty("/newCommentText");
            if (!sNewComment || sNewComment.trim() === "") {
                MessageBox.error("Please enter a comment");
                return;
            }

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Just Now",
                text: sNewComment
            });
            oModel.setProperty("/existingComments", aExistingComments);
            oModel.setProperty("/newCommentText", "");
            MessageToast.show("Comment added successfully");
        },

        onSaveCommentOption: function () {
            var oModel = this.getView().getModel();
            var sCommentType = oModel.getProperty("/currentCommentType");
            if (sCommentType === "daily") {
                this._saveDailyComment();
            } else if (sCommentType === "weekly") {
                this._saveWeeklyComment();
            } else if (sCommentType === "monthly") {
                this._saveMonthlyComment();
            }
        },

        _saveCommentToTimesheet: function (sComment, sType, sProjectName, sWorkTypeName) {
            var oModel = this.getView().getModel();
            var aTimeEntries = oModel.getProperty("/timeEntries");

            var oCommentEntry = {
                id: "c" + Date.now(),
                projectId: "comment",
                projectName: sProjectName || "Comment",
                workTypeName: sWorkTypeName || (sType + " Comment"),
                workType: "COMMENT",
                status: "Approved",
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: sComment,
                isApproved: true,
                isFutureDay: false,
                isCommentEntry: true,
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };

            aTimeEntries.push(oCommentEntry);
            oModel.setProperty("/timeEntries", aTimeEntries);

            // Save to backend
            this._persistToBackend(oCommentEntry)
                .then(function () {
                    var oTable = this.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }
                    MessageToast.show(sType + " comment saved to timesheet");
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error("Failed to save comment to server");
                    console.error("Error saving comment:", oError);
                });
        },

        _saveDailyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/dailyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");
            var sStatus = oModel.getProperty("/selectedStatus");
            var sPriority = oModel.getProperty("/selectedPriority");
            var bNeedInput = oModel.getProperty("/needInput");
            var sSelectedDay = oModel.getProperty("/selectedDay");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a description for the daily comment");
                return;
            }
            if (!sProject) {
                MessageBox.error("Please select a project");
                return;
            }
            if (!sWorkType) {
                MessageBox.error("Please select a work type");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var aStatusOptions = oModel.getProperty("/statusOptions");
            var aPriorityOptions = oModel.getProperty("/priorityOptions");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });
            var oSelectedStatus = aStatusOptions.find(function (item) { return item.key === sStatus; });
            var oSelectedPriority = aPriorityOptions.find(function (item) { return item.key === sPriority; });

            var oCommentData = {
                type: "daily",
                day: sSelectedDay,
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                status: oSelectedStatus ? oSelectedStatus.text : "Unknown",
                priority: oSelectedPriority ? oSelectedPriority.text : "Unknown",
                dueDateStart: oModel.getProperty("/dueDateStart"),
                dueDateEnd: oModel.getProperty("/dueDateEnd"),
                description: sComment,
                needInput: bNeedInput,
                timestamp: new Date().toISOString()
            };

            console.log("Saving daily comment:", oCommentData);

            var sFormattedComment = "[" + sSelectedDay + "] " + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown") +
                "\nStatus: " + (oSelectedStatus ? oSelectedStatus.text : "Unknown") +
                "\nPriority: " + (oSelectedPriority ? oSelectedPriority.text : "Unknown");

            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedDay;
            });
            var now = new Date();
            var timeStr = now.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            if (oDayComment) {
                oDayComment.comment = sComment;
                oDayComment.lastUpdated = timeStr;
            } else {
                aDailyComments.push({
                    day: sSelectedDay,
                    comment: sComment,
                    lastUpdated: timeStr
                });
            }
            oModel.setProperty("/dailyComments", aDailyComments);
            this._updateCounts();

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Daily",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveWeeklyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/weeklyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a weekly summary");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });

            var oCommentData = {
                type: "weekly",
                week: oModel.getProperty("/currentWeek"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                summary: sComment,
                timestamp: new Date().toISOString()
            };

            console.log("Saving weekly comment:", oCommentData);

            var sFormattedComment = "[Weekly Summary - " + oModel.getProperty("/currentWeek") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Weekly Summary - " + new Date().toLocaleDateString(),
                text: "[WEEKLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Weekly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveMonthlyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/monthlyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a monthly review");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });

            var oCommentData = {
                type: "monthly",
                month: oModel.getProperty("/currentMonth"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                review: sComment,
                timestamp: new Date().toISOString()
            };

            console.log("Saving monthly comment:", oCommentData);

            var sFormattedComment = "[Monthly Review - " + oModel.getProperty("/currentMonth") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Monthly Review - " + new Date().toLocaleDateString(),
                text: "[MONTHLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Monthly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        onCancelCommentOption: function () {
            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        onDaySelect: function (oEvent) {
            var oModel = this.getView().getModel();
            var sSelectedKey = oEvent.getParameter("selectedKey");
            oModel.setProperty("/selectedDay", sSelectedKey);

            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedKey;
            });
            if (oDayComment && oDayComment.comment) {
                oModel.setProperty("/dailyCommentText", oDayComment.comment);
            } else {
                oModel.setProperty("/dailyCommentText", "");
            }
        },

        onEditComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();

            oModel.setProperty("/editCommentText", oEntry.comment);
            oModel.setProperty("/editCommentId", oEntry.id);

            if (!this._oEditCommentDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditComment",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditCommentDialog = oDialog;
                    this.getView().addDependent(this._oEditCommentDialog);
                    this._oEditCommentDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading edit comment dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oEditCommentDialog.open();
            }
        },

        onSaveEditedComment: function () {
            var oModel = this.getView().getModel();
            var sCommentText = oModel.getProperty("/editCommentText");
            var sCommentId = oModel.getProperty("/editCommentId");
            var that = this;

            if (!sCommentText || sCommentText.trim() === "") {
                MessageBox.error("Comment cannot be empty");
                return;
            }

            var aTimeEntries = oModel.getProperty("/timeEntries");
            var oCommentEntry = aTimeEntries.find(function (entry) {
                return entry.id === sCommentId;
            });

            if (oCommentEntry) {
                oCommentEntry.comment = sCommentText;
                oModel.setProperty("/timeEntries", aTimeEntries);

                // Save to backend
                this._persistToBackend(oCommentEntry)
                    .then(function () {
                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }
                        MessageToast.show("Comment updated successfully");

                        if (that._oEditCommentDialog) {
                            that._oEditCommentDialog.close();
                        }
                    })
                    .catch(function (oError) {
                        MessageBox.error("Failed to save comment to server");
                        console.error("Error saving comment:", oError);
                    });
            }
        },

        onCancelEditComment: function () {
            if (this._oEditCommentDialog) {
                this._oEditCommentDialog.close();
            }
        },

        onDeleteComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var that = this;

            MessageBox.confirm("Are you sure you want to delete this comment?", {
                title: "Delete Comment",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = that.getView().getModel();
                        var aTimeEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aTimeEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            var oDeletedEntry = aTimeEntries[iIndex];
                            aTimeEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aTimeEntries);

                            // Delete from backend
                            var oDataModel = that.getOwnerComponent().getModel("timesheetServiceV2");
                            if (oDataModel) {
                                oDataModel.remove("/MyTimesheets('" + oDeletedEntry.id + "')", {
                                    success: function () {
                                        var oTable = that.getView().byId("timesheetTable");
                                        if (oTable && oTable.getBinding("items")) {
                                            oTable.getBinding("items").refresh();
                                        }
                                        MessageToast.show("Comment deleted successfully");
                                    },
                                    error: function (oError) {
                                        MessageBox.error("Failed to delete comment from server");
                                        console.error("Error deleting comment:", oError);
                                    }
                                });
                            } else {
                                var oTable = that.getView().byId("timesheetTable");
                                if (oTable && oTable.getBinding("items")) {
                                    oTable.getBinding("items").refresh();
                                }
                                MessageToast.show("Comment deleted successfully");
                            }
                        }
                    }
                }
            });
        },

        onCommentLiveChange: function (oEvent) {
            // This function can be used for live validation if needed
        },

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            MessageToast.show("Switched to " + sKey + " tab");
            if (sKey === "reports") {
                this._updateReportsData();
            }
        },

        onAddEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = {
                selectedDate: this._formatDateForModel(new Date()),
                projectId: "",
                workType: "",
                hours: "8",
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: "",
                taskDetails: "",
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };
            oModel.setProperty("/newEntry", oNewEntry);

            if (!this._oAddEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.AddTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oAddEntryDialog = oDialog;
                    this.getView().addDependent(this._oAddEntryDialog);
                    this._oAddEntryDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading add time entry dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oAddEntryDialog.open();
            }
        },

        onEntryDatePickerChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sDate = oDatePicker.getValue();
            if (sDate) {
                var selectedDate = new Date(sDate);
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry/selectedDate", this._formatDateForModel(selectedDate));

                var oWeekDates = oModel.getProperty("/weekDates");
                var monday = new Date(oWeekDates.monday);
                var sunday = new Date(oWeekDates.sunday);
                if (selectedDate < monday || selectedDate > sunday) {
                    MessageBox.warning("The selected date is outside the current week. Please select a date within " +
                        this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday));
                }
            }
        },

        onFragmentHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            this._calculateAllTotals();
        },

        ontaskDetailsLiveChange: function (oEvent) {
            var oTextArea = oEvent.getSource();
            var sValue = oTextArea.getValue();
            var oModel = this.getView().getModel();

            oModel.setProperty("/newEntry/taskDetails", sValue);

            if (sValue.length >= 45) {
                oTextArea.addStyleClass("sapUiFieldWarning");
            } else {
                oTextArea.removeStyleClass("sapUiFieldWarning");
            }
        },

        _saveTimeEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = oModel.getProperty("/newEntry");
            var that = this;

            if (!oNewEntry.projectId || oNewEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return false;
            }
            if (!oNewEntry.workType || oNewEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return false;
            }
            if (!oNewEntry.hours || oNewEntry.hours.trim() === "") {
                MessageBox.error("Please select hours");
                return false;
            }

            var selectedDate = new Date(oNewEntry.selectedDate);
            var dayOfWeek = selectedDate.getDay();

            var dayMap = {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday"
            };
            var dayProperty = dayMap[dayOfWeek];

            var hoursForDay = parseFloat(oNewEntry.hours) || 0;

            if (hoursForDay === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return false;
            }

            var aEntries = oModel.getProperty("/timeEntries");

            // Check for duplicate entry
            var existingEntryIndex = aEntries.findIndex(function (entry) {
                return entry.projectId === oNewEntry.projectId && entry.workType === oNewEntry.workType;
            });

            if (existingEntryIndex !== -1) {
                var existingEntry = aEntries[existingEntryIndex];

                // Check if the existing entry already has hours for this day
                if (existingEntry[dayProperty] > 0) {
                    MessageBox.error("An entry with the same project and work type already exists for this day. Please edit the existing entry instead.");
                    return false;
                }

                if (existingEntry.isApproved) {
                    this._notifyManagerOfChange(existingEntry, "Time entry modified");
                }

                existingEntry[dayProperty] = hoursForDay;
                existingEntry.comment = oNewEntry.taskDetails || "";

                if (oNewEntry.dailyComments && oNewEntry.dailyComments[dayProperty]) {
                    existingEntry.dailyComments[dayProperty] = oNewEntry.dailyComments[dayProperty];
                }

                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                this._persistToBackend(existingEntry)
                    .then(function () {
                        that._calculateAllTotals();
                        that._updateCounts();
                        that._updateProjectEngagement();
                        that._updateReportsData();

                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        MessageToast.show("Time entry updated successfully");
                    })

            } else {
                var sNewId = "temp-" + Date.now();
                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oNewEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oNewEntry.workType;
                });

                var oTimeEntry = {
                    id: sNewId,
                    projectId: oNewEntry.projectId,
                    projectName: oProject ? oProject.projectName : "",
                    workType: oNewEntry.workType,
                    workTypeName: oWorkType ? oWorkType.name : "",
                    status: "Draft",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: oNewEntry.taskDetails || "",
                    isApproved: false,
                    isFutureDay: false,
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                };

                oTimeEntry[dayProperty] = hoursForDay;

                if (oNewEntry.dailyComments && oNewEntry.dailyComments[dayProperty]) {
                    oTimeEntry.dailyComments[dayProperty] = oNewEntry.dailyComments[dayProperty];
                }

                aEntries.push(oTimeEntry);
                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                var oPromise = this._persistToBackend(oTimeEntry);

                if (oPromise && typeof oPromise.then === 'function') {
                    oPromise.then(function (oResponse) {
                        // Update the ID with the one from the backend if it's a new entry
                        if (oResponse && oResponse.ID) {
                            oTimeEntry.id = oResponse.ID;
                            oModel.setProperty("/timeEntries", aEntries);
                        }

                        that._calculateAllTotals();
                        that._updateCounts();
                        that._updateProjectEngagement();
                        that._updateReportsData();

                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        MessageToast.show("Time entry added successfully");
                    }).catch(function (oError) {
                        MessageToast.show("Failed to save time entry");
                        console.error("Error saving time entry:", oError);
                    });
                } else {
                    // If _persistToBackend doesn't return a promise, handle synchronously
                    that._calculateAllTotals();
                    that._updateCounts();
                    that._updateProjectEngagement();
                    that._updateReportsData();

                    var oTable = that.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }

                    MessageToast.show("Time entry added successfully");
                }

            }

            return true;
        },

        onSaveNewEntry: function () {
            if (this._saveTimeEntry()) {
                this._oAddEntryDialog.close();
            }
        },

        onSaveAndNewEntry: function () {
            if (this._saveTimeEntry()) {
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry", {
                    selectedDate: this._formatDateForModel(new Date()),
                    projectId: "",
                    workType: "",
                    hours: "8",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                });
                MessageToast.show("Time entry saved. Ready for new entry.");
            }
        },

        onCancelNewEntry: function () {
            this._oAddEntryDialog.close();
        },

        onEditEntry: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();
            oModel.setProperty("/editEntry", JSON.parse(JSON.stringify(oEntry)));

            if (!this._oEditEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditEntryDialog = oDialog;
                    this.getView().addDependent(this._oEditEntryDialog);
                    this._oEditEntryDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading edit time entry dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oEditEntryDialog.open();
            }
        },

        onCancelEditEntry: function () {
            if (this._oEditEntryDialog) {
                this._oEditEntryDialog.close();
            }
        },

        onSaveEditedEntry: function () {
            var oModel = this.getView().getModel();
            var oEditEntry = oModel.getProperty("/editEntry");
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            if (!oEditEntry.projectId || oEditEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return;
            }
            if (!oEditEntry.workType || oEditEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return;
            }

            var totalHours = parseFloat(oEditEntry.monday || 0) +
                parseFloat(oEditEntry.tuesday || 0) +
                parseFloat(oEditEntry.wednesday || 0) +
                parseFloat(oEditEntry.thursday || 0) +
                parseFloat(oEditEntry.friday || 0) +
                parseFloat(oEditEntry.saturday || 0) +
                parseFloat(oEditEntry.sunday || 0);

            if (totalHours === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return;
            }

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEditEntry.id;
            });

            if (iIndex > -1) {
                if (aEntries[iIndex].isApproved) {
                    this._notifyManagerOfChange(aEntries[iIndex], "Time entry modified");
                }

                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oEditEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oEditEntry.workType;
                });

                oEditEntry.projectName = oProject ? oProject.projectName : "";
                oEditEntry.workTypeName = oWorkType ? oWorkType.name : "";

                Object.keys(oEditEntry).forEach(function (key) {
                    aEntries[iIndex][key] = oEditEntry[key];
                });

                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                this._persistToBackend(aEntries[iIndex])
                    .then(function () {
                        that._calculateAllTotals();
                        that._updateProjectEngagement();
                        that._updateReportsData();

                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        that._oEditEntryDialog.close();
                        MessageToast.show("Time entry updated successfully");
                    })

            }
        },

        onDeleteEntry: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext();
            if (!oContext) return;
            var oEntry = oContext.getObject();
            var that = this;

            if (oEntry.isApproved) {
                MessageBox.warning("Cannot delete approved entry. Please contact your manager.");
                return;
            }

            MessageBox.confirm("Are you sure you want to delete this time entry?", {
                title: "Delete Entry",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = that.getView().getModel();
                        var aEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            var oDeletedEntry = aEntries[iIndex];
                            aEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aEntries);

                            // Delete from backend
                            var oDataModel = that.getOwnerComponent().getModel("timesheetServiceV2");
                            if (oDataModel) {
                                oDataModel.remove("/MyTimesheets('" + oDeletedEntry.id + "')", {
                                    success: function () {
                                        that._calculateAllTotals();
                                        that._updateCounts();
                                        that._updateProjectEngagement();
                                        that._updateReportsData();

                                        var oTable = that.getView().byId("timesheetTable");
                                        if (oTable && oTable.getBinding("items")) {
                                            oTable.getBinding("items").refresh();
                                        }
                                        MessageToast.show("Time entry deleted");
                                    },
                                    error: function (oError) {
                                        MessageBox.error("Failed to delete entry from server");
                                        console.error("Error deleting entry:", oError);
                                    }
                                });
                            } else {
                                that._calculateAllTotals();
                                that._updateCounts();
                                that._updateProjectEngagement();
                                that._updateReportsData();

                                var oTable = that.getView().byId("timesheetTable");
                                if (oTable && oTable.getBinding("items")) {
                                    oTable.getBinding("items").refresh();
                                }
                                MessageToast.show("Time entry deleted");
                            }
                        }
                    }
                }
            });
        },

        onHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            this._calculateAllTotals();
            this._validateDailyHours();
        },

        _calculateAllTotals: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var fWeekTotal = 0;

            aEntries.forEach(function (oEntry) {
                fWeekTotal += parseFloat(oEntry.monday) || 0;
                fWeekTotal += parseFloat(oEntry.tuesday) || 0;
                fWeekTotal += parseFloat(oEntry.wednesday) || 0;
                fWeekTotal += parseFloat(oEntry.thursday) || 0;
                fWeekTotal += parseFloat(oEntry.friday) || 0;
                fWeekTotal += parseFloat(oEntry.saturday) || 0;
                fWeekTotal += parseFloat(oEntry.sunday) || 0;
            });

            oModel.setProperty("/totalWeekHours", fWeekTotal.toFixed(2));

            // Calculate daily totals from time entries
            var oDailyTotals = {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0
            };

            aEntries.forEach(function (oEntry) {
                oDailyTotals.monday += parseFloat(oEntry.monday) || 0;
                oDailyTotals.tuesday += parseFloat(oEntry.tuesday) || 0;
                oDailyTotals.wednesday += parseFloat(oEntry.wednesday) || 0;
                oDailyTotals.thursday += parseFloat(oEntry.thursday) || 0;
                oDailyTotals.friday += parseFloat(oEntry.friday) || 0;
                oDailyTotals.saturday += parseFloat(oEntry.saturday) || 0;
                oDailyTotals.sunday += parseFloat(oEntry.sunday) || 0;
            });

            // Update daily totals in model
            oModel.setProperty("/dailyTotals", oDailyTotals);

            this._updateProjectEngagement();
        },

        _updateProjectEngagement: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var aEngagement = [];

            aProjects.forEach(function (oProject) {
                var aProjectEntries = aEntries.filter(function (oEntry) {
                    return oEntry.projectId === oProject.projectId;
                });

                var fTotalHours = aProjectEntries.reduce(function (total, oEntry) {
                    return total + (parseFloat(oEntry.monday) || 0) +
                        (parseFloat(oEntry.tuesday) || 0) +
                        (parseFloat(oEntry.wednesday) || 0) +
                        (parseFloat(oEntry.thursday) || 0) +
                        (parseFloat(oEntry.friday) || 0) +
                        (parseFloat(oEntry.saturday) || 0) +
                        (parseFloat(oEntry.sunday) || 0);
                }, 0);

                aEngagement.push({
                    projectName: oProject.projectName,
                    managerName: oProject.managerName,
                    totalHours: fTotalHours.toFixed(2),
                    engagementDuration: this._calculateEngagementDuration(oProject.startDate, oProject.endDate),
                    status: oProject.status
                });
            }.bind(this));

            oModel.setProperty("/projectEngagement", aEngagement);
        },

        // ... previous code remains unchanged ...

        _updateReportsData: function () {
            var oModel = this.getView().getModel();
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var that = this;

            if (!oDataModel) {
                console.error("OData model not available for reports data");
                return;
            }

            BusyIndicator.show(0);

            // Read data from the new endpoints
            Promise.all([
                this._readODataEntity(oDataModel, "/BookedHoursOverview"),
                this._readODataEntity(oDataModel, "/ProjectEngagementDuration")
            ]).then(function (aResults) {
                // Debug: Log raw data to console
                console.log("Booked Hours Overview Raw Data:", aResults[0]);
                console.log("Project Engagement Duration Raw Data:", aResults[1]);

                // Process Booked Hours Overview data
                var aBookedHours = aResults[0] && aResults[0].results ? aResults[0].results :
                    (Array.isArray(aResults[0]) ? aResults[0] : []);
                var aFormattedBookedHours = aBookedHours.map(function (item) {
                    // Try multiple possible property names for project name
                    var projectName = item.ProjectName || item.projectName ||
                        item.Project || item.project ||
                        item.Name || item.name ||
                        item.project_ID || item.ProjectID ||
                        "Unknown Project";

                    return {
                        projectName: projectName,
                        allocatedHours: item.AllocatedHours || item.allocatedHours ||
                            item.Allocated_Hours || item.allocatedHours || 0,
                        bookedHours: item.BookedHours || item.bookedHours || 0,
                        remainingHours: item.RemainingHours || item.remainingHours || 0,
                        utilization: item.Utilization || item.utilization || 0
                    };
                });

                // Process Project Engagement Duration data
                var aProjectEngagement = aResults[1] && aResults[1].results ? aResults[1].results :
                    (Array.isArray(aResults[1]) ? aResults[1] : []);
                var aFormattedProjectEngagement = aProjectEngagement.map(function (item) {
                    // Try multiple possible property names for project name
                    var projectName = item.ProjectName || item.projectName ||
                        item.Project || item.project ||
                        item.Name || item.name ||
                        item.project_ID || item.ProjectID ||
                        "Unknown Project";

                    return {
                        projectName: projectName,
                        startDate: item.StartDate || item.startDate || "",
                        endDate: item.EndDate || item.endDate || "",
                        durationDays: item.DurationDays || item.durationDays || 0,
                        daysRemaining: item.DaysRemaining || item.daysRemaining || 0,
                        timelineStatus: item.TimelineStatus || item.timelineStatus || "On Track"
                    };
                });

                // Debug: Log formatted data
                console.log("Formatted Booked Hours:", aFormattedBookedHours);
                console.log("Formatted Project Engagement:", aFormattedProjectEngagement);

                // Update model properties with the new data
                oModel.setProperty("/employeeProjectHours", aFormattedBookedHours);
                oModel.setProperty("/employeeProjectDurations", aFormattedProjectEngagement);

                // Force model refresh to ensure UI updates
                oModel.refresh(true);

                BusyIndicator.hide();
            }).catch(function (oError) {
                BusyIndicator.hide();
                console.error("Error loading reports data:", oError);
                // Fallback to existing calculation if endpoints fail
                that._fallbackReportsCalculation();
            });
        },

        // Fallback method if endpoints fail
        _fallbackReportsCalculation: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var today = new Date();

            // Booked Hours Overview
            var aEmployeeProjectHours = aProjects.map(function (project) {
                var aProjectEntries = aEntries.filter(function (entry) {
                    return entry.projectId === project.projectId;
                });

                var bookedHours = aProjectEntries.reduce(function (total, entry) {
                    return total + (parseFloat(entry.monday) || 0) +
                        (parseFloat(entry.tuesday) || 0) +
                        (parseFloat(entry.wednesday) || 0) +
                        (parseFloat(entry.thursday) || 0) +
                        (parseFloat(entry.friday) || 0) +
                        (parseFloat(entry.saturday) || 0) +
                        (parseFloat(entry.sunday) || 0);
                }, 0);

                var utilization = project.allocatedHours > 0 ? Math.round((bookedHours / project.allocatedHours) * 100) : 0;

                return {
                    projectName: project.projectName || project.Project || project.Name || "Unknown Project",
                    allocatedHours: project.allocatedHours || 0,
                    bookedHours: bookedHours,
                    remainingHours: project.allocatedHours - bookedHours,
                    utilization: utilization
                };
            });

            // Project Engagement Duration
            var aEmployeeProjectDurations = aProjects.map(function (project) {
                var startDate = new Date(project.startDate);
                var endDate = new Date(project.endDate);
                var durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                var daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                var timelineStatus = project.status === "Completed" ? "Completed" :
                    project.status === "On Hold" ? "On Hold" :
                        daysRemaining < 0 ? "Delayed" :
                            daysRemaining < 14 ? "At Risk" : "On Track";

                return {
                    projectName: project.projectName || project.Project || project.Name || "Unknown Project",
                    startDate: project.startDate,
                    endDate: project.endDate,
                    durationDays: durationDays,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    timelineStatus: timelineStatus
                };
            });

            // Update model properties
            oModel.setProperty("/employeeProjectHours", aEmployeeProjectHours);
            oModel.setProperty("/employeeProjectDurations", aEmployeeProjectDurations);

            // Force model refresh to ensure UI updates
            oModel.refresh(true);
        },

        // ... rest of the code remains unchanged ...

        // Fallback method if endpoints fail
        _fallbackReportsCalculation: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var today = new Date();

            // Booked Hours Overview
            var aEmployeeProjectHours = aProjects.map(function (project) {
                var aProjectEntries = aEntries.filter(function (entry) {
                    return entry.projectId === project.projectId;
                });

                var bookedHours = aProjectEntries.reduce(function (total, entry) {
                    return total + (parseFloat(entry.monday) || 0) +
                        (parseFloat(entry.tuesday) || 0) +
                        (parseFloat(entry.wednesday) || 0) +
                        (parseFloat(entry.thursday) || 0) +
                        (parseFloat(entry.friday) || 0) +
                        (parseFloat(entry.saturday) || 0) +
                        (parseFloat(entry.sunday) || 0);
                }, 0);

                var utilization = project.allocatedHours > 0 ? Math.round((bookedHours / project.allocatedHours) * 100) : 0;

                return {
                    projectName: project.projectName,
                    allocatedHours: project.allocatedHours,
                    bookedHours: bookedHours,
                    remainingHours: project.allocatedHours - bookedHours,
                    utilization: utilization
                };
            });

            // Project Engagement Duration
            var aEmployeeProjectDurations = aProjects.map(function (project) {
                var startDate = new Date(project.startDate);
                var endDate = new Date(project.endDate);
                var durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                var daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                var timelineStatus = project.status === "Completed" ? "Completed" :
                    project.status === "On Hold" ? "On Hold" :
                        daysRemaining < 0 ? "Delayed" :
                            daysRemaining < 14 ? "At Risk" : "On Track";

                return {
                    projectName: project.projectName,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    durationDays: durationDays,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    timelineStatus: timelineStatus
                };
            });

            // Update model properties
            oModel.setProperty("/employeeProjectHours", aEmployeeProjectHours);
            oModel.setProperty("/employeeProjectDurations", aEmployeeProjectDurations);

            // Force model refresh to ensure UI updates
            oModel.refresh(true);
        },

        // ... rest of the code remains unchanged ...

        _calculateEngagementDuration: function (sStartDate, sEndDate) {
            var oStart = new Date(sStartDate);
            var oEnd = new Date(sEndDate);
            var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
                (oEnd.getMonth() - oStart.getMonth());

            if (iMonths === 0) {
                var iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24));
                return iDays + " days";
            } else if (iMonths < 12) {
                return iMonths + " months";
            } else {
                var iYears = Math.floor(iMonths / 12);
                var iRemainingMonths = iMonths % 12;
                return iYears + " year" + (iYears > 1 ? "s" : "") +
                    (iRemainingMonths > 0 ? " " + iRemainingMonths + " months" : "");
            }
        },

        _validateDailyHours: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var today = new Date();
            var aWarnings = [];

            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required)");
                }
            });

            if (aWarnings.length > 0) {
                console.warn("Hours validation warnings:", aWarnings);
            }
        },

        onProjectSelect: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (oSelectedItem) {
                var oProject = oSelectedItem.getBindingContext().getObject();
                MessageToast.show("Selected project: " + oProject.projectName + " (Manager: " + oProject.managerName + ")");
            }
        },

        onProjectChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Project changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        onWorkTypeChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Work type changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        _notifyManagerOfChange: function (oEntry, sChangeDescription) {
            MessageBox.information("Change notification sent to manager: " + sChangeDescription);
            console.log("Manager notified of change:", sChangeDescription, oEntry);
        },

        onSaveDraft: function () {
            var that = this;
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");

            // If there are no entries, show a message and return
            if (aEntries.length === 0) {
                MessageToast.show("No entries to save");
                return;
            }

            BusyIndicator.show(0);

            // Create an array of promises for each entry
            var aPromises = aEntries.map(function (oEntry) {
                return that._persistToBackend(oEntry, "Draft");
            });

            Promise.all(aPromises)
                .then(function (aResults) {
                    // All entries saved successfully
                    BusyIndicator.hide();
                    MessageToast.show("Timesheet saved as draft successfully!");

                    // Refresh the data to get the latest from the backend
                    that._loadData();
                })

        },

        onSubmitApproval: function () {
            if (this._validateTimesheet()) {
                var that = this;
                var oModel = this.getView().getModel();
                var aEntries = oModel.getProperty("/timeEntries");

                // Show a loading indicator
                BusyIndicator.show(0);

                // Update all entries to "Submitted" status
                var aPromises = aEntries.map(function (oEntry) {
                    oEntry.status = "Submitted";
                    return that._persistToBackend(oEntry, "Submitted");
                });

                Promise.all(aPromises)
                    .then(function () {
                        // Now submit for approval
                        MessageBox.confirm("Are you sure you want to submit this timesheet for approval? Once submitted, changes will require manager approval.", {
                            title: "Submit for Approval",
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    // Set isSubmitted flag in model
                                    oModel.setProperty("/isSubmitted", true);

                                    BusyIndicator.hide();
                                    MessageToast.show("Timesheet submitted for approval");
                                    that._updateProjectEngagement();
                                    that._updateCounts();
                                    that._updateReportsData();

                                    var oTable = that.getView().byId("timesheetTable");
                                    if (oTable && oTable.getBinding("items")) {
                                        oTable.getBinding("items").refresh();
                                    }

                                    // Navigate to admin view
                                    if (that._oRouter) {
                                        that._oRouter.navTo("admin");
                                    } else {
                                        var oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                                        oHashChanger.setHash("/admin");
                                        MessageToast.show("Timesheet submitted. Navigation to admin page completed.");
                                    }
                                } else {
                                    BusyIndicator.hide();
                                }
                            }
                        });
                    })

            }
        },

        _validateTimesheet: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var aEntries = oModel.getProperty("/timeEntries");
            var bIsValid = true;
            var aWarnings = [];
            var aErrors = [];

            aEntries.forEach(function (oEntry, index) {
                if (!oEntry.projectId || oEntry.projectId.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Project is mandatory.");
                }
                if (!oEntry.workType || oEntry.workType.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Work Type is mandatory.");
                }
                if (parseFloat(oEntry.monday) === 0 && parseFloat(oEntry.tuesday) === 0 &&
                    parseFloat(oEntry.wednesday) === 0 && parseFloat(oEntry.thursday) === 0 &&
                    parseFloat(oEntry.friday) === 0 && parseFloat(oEntry.saturday) === 0 &&
                    parseFloat(oEntry.sunday) === 0) {
                    aErrors.push("Entry " + (index + 1) + ": At least one day's hours must be entered.");
                }
            });

            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required for past dates)");
                }

                if (fHours > 24) {
                    bIsValid = false;
                    aErrors.push(sDay + " has more than 24 hours. Please correct the entries.");
                    return false;
                }
            });



            if (aWarnings.length > 0) {
                MessageBox.warning(aWarnings.join("\n") + "\n\nYou can still submit, but please ensure you meet the 8-hour requirement for past dates.", {
                    title: "Validation Warnings",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.CANCEL) {
                            bIsValid = false;
                        }
                    }
                });
            }

            return bIsValid;
        },

        onViewReports: function () {
            var oModel = this.getView().getModel();
            var aEngagement = oModel.getProperty("/projectEngagement");
            var sReport = "Progress Reports:\n\n";

            aEngagement.forEach(function (oProject) {
                sReport += "Project: " + oProject.projectName + "\n";
                sReport += "Manager: " + oProject.managerName + "\n";
                sReport += "Total Hours: " + oProject.totalHours + "\n";
                sReport += "Duration: " + oProject.engagementDuration + "\n";
                sReport += "Status: " + oProject.status + "\n\n";
            });

            MessageBox.information(sReport);
        },

        onPreviousWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() - 7);
            this._updateWeekDates(mondayDate);
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));
            this._showNotification("Data sent to manager", "sap-icon://notification-2");
        },

        onCurrentWeekTS: function () {
            var today = new Date();
            this._updateWeekDates(today);
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            MessageToast.show("Navigated to current week");
        },

        onNextWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() + 7);
            this._updateWeekDates(mondayDate);
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));

            var aEntries = oModel.getProperty("/timeEntries");
            var allZeroHours = aEntries.every(function (entry) {
                return parseFloat(entry.monday) === 0 &&
                    parseFloat(entry.tuesday) === 0 &&
                    parseFloat(entry.wednesday) === 0 &&
                    parseFloat(entry.thursday) === 0 &&
                    parseFloat(entry.friday) === 0 &&
                    parseFloat(entry.saturday) === 0 &&
                    parseFloat(entry.sunday) === 0;
            });

            if (allZeroHours) {
                oModel.setProperty("/timeEntries", []);
                MessageToast.show("All entries had 0 hours. Table has been cleared.");
            } else {
                var hasLeaveEntry = aEntries.some(function (entry) {
                    return entry.workType === "LEAVE";
                });

                if (!hasLeaveEntry) {
                    var oProject = oModel.getProperty("/assignedProjects")[0];
                    if (oProject) {
                        aEntries.push({
                            id: "leave-" + Date.now(),
                            projectId: oProject.projectId,
                            projectName: oProject.projectName,
                            workType: "LEAVE",
                            workTypeName: "Leave",
                            status: "Pending",
                            monday: 0,
                            tuesday: 0,
                            wednesday: 0,
                            thursday: 0,
                            friday: 0,
                            saturday: 0,
                            sunday: 0,
                            comment: "Leave entry",
                            isApproved: false,
                            isFutureDay: false,
                            dailyComments: {
                                monday: "",
                                tuesday: "",
                                wednesday: "",
                                thursday: "",
                                friday: "",
                                saturday: "",
                                sunday: ""
                            }
                        });
                        oModel.setProperty("/timeEntries", aEntries);
                        MessageToast.show("Leave entry added for the week.");
                    }
                }
            }

            var oTable = this.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
        },

        onDatePickerChange: function (oEvent) {
            var sDate = oEvent.getParameter("value");
            if (sDate) {
                var selectedDate = new Date(sDate);
                this._updateWeekDates(selectedDate);
                MessageToast.show("Week updated for selected date: " + sDate);
            }
        },

        onPreviousWeek: function () {
            this.onPreviousWeekTS();
        },

        onNextWeek: function () {
            this.onNextWeekTS();
        },

        onToday: function () {
            this.onCurrentWeekTS();
        },

        onSettingsPress: function () {
            MessageBox.information("Timesheet Settings:\n\n- Working hours: 8 hours/day\n- Future bookings allowed for Leave/Training only\n- Manager notifications for approved entry changes");
        },

        onLogoutPress: function () {
            MessageBox.confirm("Are you sure you want to logout?", {
                title: "Logout",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        MessageToast.show("Logged out successfully");
                    }
                }
            });
        },

        _showNotification: function (sMessage, sIcon) {
            var oNotification = new sap.m.Dialog({
                title: "Notification",
                icon: sIcon || "sap-icon://notification-2",
                content: new sap.m.Text({
                    text: sMessage
                }),
                beginButton: new sap.m.Button({
                    text: "OK",
                    press: function () {
                        oNotification.close();
                    }
                }),
                afterClose: function () {
                    oNotification.destroy();
                }
            });

            oNotification.addStyleClass("amazonNotification");
            oNotification.open();
        },

        // Day overflow functionality
        onDayOverflowPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var sDay = oButton.data("day");
            var oContext = oButton.getBindingContext();
            if (!oContext) {
                MessageToast.show("Unable to get entry data");
                return;
            }

            var oEntry = oContext.getObject();
            this._currentEditEntry = oEntry;
            this._currentEditDay = sDay;

            if (!this._oDayOverflowMenu) {
                this._oDayOverflowMenu = new Menu({
                    items: [
                        new MenuItem({
                            text: "Edit",
                            icon: "sap-icon://edit",
                            press: this.onEditDayHours.bind(this)
                        }),
                        new MenuItem({
                            text: "Delete",
                            icon: "sap-icon://delete",
                            press: this.onDeleteDayHours.bind(this)
                        })
                    ]
                });
                this.getView().addDependent(this._oDayOverflowMenu);
            }

            this._oDayOverflowMenu.openBy(oButton);
        },

        onEditDayHours: function () {
            var oEntry = this._currentEditEntry;
            var sDay = this._currentEditDay;

            if (!oEntry || !sDay) {
                MessageToast.show("Unable to edit. Please try again.");
                return;
            }

            var fCurrentHours = parseFloat(oEntry[sDay]) || 0;

            var oDialog = new Dialog({
                title: "Edit Hours - " + this._capitalize(sDay),
                contentWidth: "300px",
                content: [
                    new VBox({
                        items: [
                            new Label({
                                text: "Project: " + oEntry.projectName,
                                class: "sapUiTinyMarginBottom"
                            }),
                            new Label({
                                text: "Work Type: " + oEntry.workTypeName,
                                class: "sapUiTinyMarginBottom"
                            }),
                            new Label({
                                text: "Enter Hours (0-15):",
                                class: "sapUiSmallMarginTop"
                            }),
                            new Input("editHoursInput", {
                                type: "Number",
                                value: fCurrentHours.toString(),
                                placeholder: "Enter hours (0-24)",
                                liveChange: function (oEvt) {
                                    var fValue = parseFloat(oEvt.getParameter("value"));
                                    var oInput = oEvt.getSource();

                                    if (isNaN(fValue) || fValue < 0 || fValue > 24) {
                                        oInput.setValueState("Error");
                                        oInput.setValueStateText("Please enter a value between 0 and 24");
                                    } else {
                                        oInput.setValueState("None");
                                    }
                                }
                            })
                        ]
                    })
                ],
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: function () {
                        var oInput = sap.ui.getCore().byId("editHoursInput");
                        var fNewHours = parseFloat(oInput.getValue());

                        if (isNaN(fNewHours) || fNewHours < 0 || fNewHours > 24) {
                            MessageBox.error("Please enter a valid value between 0 and 24");
                            return;
                        }

                        this._saveEditedDayHoursAuto(oEntry, sDay, fNewHours);
                        oDialog.close();
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            this.getView().addDependent(oDialog);
            oDialog.open();

            setTimeout(function () {
                sap.ui.getCore().byId("editHoursInput").focus();
            }, 100);
        },

        _saveEditedDayHoursAuto: function (oEntry, sDay, fNewHours) {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEntry.id;
            });

            if (iIndex === -1) {
                MessageBox.error("Entry not found");
                return;
            }

            aEntries[iIndex][sDay] = fNewHours;

            if (aEntries[iIndex].isApproved) {
                this._notifyManagerOfChange(
                    aEntries[iIndex],
                    "Hours updated for " + this._capitalize(sDay) + " from " +
                    oEntry[sDay] + " to " + fNewHours
                );
            }

            oModel.setProperty("/timeEntries", aEntries);

            // Save to backend
            Promise.resolve(this._persistToBackend(aEntries))
                .then(function (oResponse) {
                    // Recalculate totals
                    that._calculateAllTotals();

                    // Refresh table
                    var oTable = that.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }

                    // Show success message
                    MessageToast.show(
                        that._capitalize(sDay) + " hours updated to " + fNewHours.toFixed(2) +
                        " for " + oEntry.projectName
                    );

                    // Close dialog
                    oDialog.close();
                })
                .catch(function (oError) {
                    MessageToast.show("Failed to save hours");
                    console.error("Error saving hours:", oError);
                });
        },


        onDeleteDayHours: function () {
            var oEntry = this._currentEditEntry;
            var sDay = this._currentEditDay;

            if (!oEntry || !sDay) {
                MessageToast.show("Unable to delete. Please try again.");
                return;
            }

            var fCurrentHours = parseFloat(oEntry[sDay]) || 0;

            MessageBox.confirm(
                "Delete " + fCurrentHours.toFixed(2) + " hours for " +
                this._capitalize(sDay) + "?\n\nProject: " + oEntry.projectName +
                "\nWork Type: " + oEntry.workTypeName,
                {
                    title: "Confirm Deletion",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteHoursAuto(oEntry, sDay);
                        }
                    }.bind(this)
                }
            );
        },

        _deleteHoursAuto: function (oEntry, sDay) {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEntry.id;
            });

            if (iIndex === -1) {
                MessageBox.error("Entry not found");
                return;
            }

            var fOldHours = aEntries[iIndex][sDay];
            aEntries[iIndex][sDay] = 0;

            if (aEntries[iIndex].isApproved) {
                this._notifyManagerOfChange(
                    aEntries[iIndex],
                    "Hours deleted for " + this._capitalize(sDay) +
                    " (was " + fOldHours + " hours)"
                );
            }

            oModel.setProperty("/timeEntries", aEntries);

            // Save to backend
            this._persistToBackend(aEntries[iIndex])
                .then(function () {
                    that._calculateAllTotals();

                    var oTable = that.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }

                    MessageToast.show(
                        that._capitalize(sDay) + " hours deleted for " + oEntry.projectName
                    );
                })
                .catch(function (oError) {
                    MessageBox.error("Failed to delete hours from server");
                    console.error("Error deleting hours:", oError);
                });
        },

        _persistToBackend: function (sActionType) {
            var oView = this.getView();
            var oDialog = oView.byId("addEntryDialog") || sap.ui.getCore().byId("addEntryDialog");
            var oModel = this.getView().getModel("timesheetServiceV2"); // use correct model

            if (!oDialog) {
                sap.m.MessageBox.error("Add Entry Dialog not found.");
                return;
            }

            // ✅ Get control references from fragment (using sap.ui.getCore())
            var oDatePicker = sap.ui.getCore().byId("entryDatePicker");
            var oProjectCombo = sap.ui.getCore().byId("projectComboBox");
            var oWorkTypeCombo = sap.ui.getCore().byId("workTypeComboBox");
            var oTaskInput = sap.ui.getCore().byId("taskDetailsInput");
            var oHoursCombo = sap.ui.getCore().byId("hoursComboBox");

            // ✅ Check if controls exist
            if (!oDatePicker || !oProjectCombo || !oWorkTypeCombo || !oTaskInput || !oHoursCombo) {
                sap.m.MessageToast.show("Some input fields are missing in the dialog.");
                return;
            }

            // ✅ Get actual values
            var sDate = oDatePicker.getDateValue(); // returns JS Date object
            var sProjectId = oProjectCombo.getSelectedKey();
            var sWorkType = oWorkTypeCombo.getSelectedKey();
            var sTaskDetails = oTaskInput.getValue();
            var sHours = oHoursCombo.getSelectedKey();

            // ✅ Basic validation
            if (!sDate || !sProjectId || !sWorkType || !sHours || !sTaskDetails) {
                sap.m.MessageToast.show("Please fill in all mandatory fields.");
                return;
            }

            // ✅ Determine status based on action type
            var sStatus = sActionType === "submit" ? "Submitted" : "Draft";

            // ✅ Build payload (now correctly converting Date to YYYY-MM-DD)
            var oPayload = {
                workDate: sDate.toISOString().split("T")[0],
                project_ID: sProjectId,
                hoursWorked: parseFloat(sHours),
                task: sWorkType,
                taskDetails: sTaskDetails,
                status: sStatus,
                isBillable: true
            };

            sap.ui.core.BusyIndicator.show(0);

            // ✅ Create entry in backend
            oModel.create("/Timesheets", oPayload, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    var sMsg = sStatus === "Submitted"
                        ? "Time entry submitted successfully!"
                        : "Time entry saved as draft successfully!";
                    sap.m.MessageToast.show(sMsg);
                    oModel.refresh(true);
                    oDialog.close();
                },
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to save entry. Please try again.");
                    console.error(oError);
                }
            });
        },



        _persistToBackendoo: function (oEntry, sStatus) {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");


            if (!oDataModel) {
                console.warn("OData model not available for persistence");
                return Promise.reject("OData model not available");
            }

            // Get current profile for employee ID
            var oProfile = this.getView().getModel().getProperty("/profile");
            // var semployee_ID = oProfile.employee_ID;

            // if (!semployee_ID) {
            //     console.warn("Employee ID not found in profile");
            //     return Promise.reject("Employee ID not available");
            // }

            // Construct data payload expected by backend - FIXED to match OData entity properties
            // var oData = {
            //     // employee_ID: semployee_ID,
            //     ProjectID: oEntry.projectId,
            //     ActivityID: oEntry.workType,
            //     WorkDate: this._getCurrentWeekMonday(),
            //     Task: oEntry.workTypeName || "General Task",
            //     TaskDetails: oEntry.comment || "",
            //     HoursWorked: this._calculateTotalHours(oEntry),
            //     Monday: parseFloat(oEntry.monday) || 0,
            //     Tuesday: parseFloat(oEntry.tuesday) || 0,
            //     Wednesday: parseFloat(oEntry.wednesday) || 0,
            //     Thursday: parseFloat(oEntry.thursday) || 0,
            //     Friday: parseFloat(oEntry.friday) || 0,
            //     Saturday: parseFloat(oEntry.saturday) || 0,
            //     Sunday: parseFloat(oEntry.sunday) || 0,
            //     Status: sStatus || oEntry.status || "Draft",
            //     IsBillable: true
            // };

            // Add ID for updates
            if (oEntry.id && !oEntry.id.startsWith("temp")) {
                oData.ID = oEntry.id;
            }

            console.log("📤 Final Payload Sent to Backend:",);

            // Promise-based backend persistence
            return new Promise(function (resolve, reject) {
                if (!oEntry.id || oEntry.id.startsWith("temp") || oEntry.id.startsWith("leave-")) {
                    // CREATE new record
                    oDataModel.create("/MyTimesheets", {
                        success: function (oResponse) {
                            console.log("✅ Successfully created entry:", oResponse);
                            resolve(oResponse);
                        },
                        error: function (oError) {
                            console.error("❌ Error creating entry:", oError);
                            reject(oError);
                        }
                    });
                } else {
                    // UPDATE existing record
                    var sPath = "/MyTimesheets('" + oEntry.id + "')";
                    oDataModel.update(sPath, oData, {
                        success: function (oResponse) {
                            console.log("✅ Successfully updated entry:", oResponse);
                            resolve(oResponse);
                        },
                        error: function (oError) {
                            console.error("❌ Error updating entry:", oError);
                            reject(oError);
                        }
                    });
                }
            });
        },

        _getCurrentWeekMonday: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            return oWeekDates.monday;
        },

        _calculateTotalHours: function (oEntry) {
            return (parseFloat(oEntry.monday) || 0) +
                (parseFloat(oEntry.tuesday) || 0) +
                (parseFloat(oEntry.wednesday) || 0) +
                (parseFloat(oEntry.thursday) || 0) +
                (parseFloat(oEntry.friday) || 0) +
                (parseFloat(oEntry.saturday) || 0) +
                (parseFloat(oEntry.sunday) || 0);
        },

        _capitalize: function (str) {
            if (!str) return "";
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        // Profile functionality
        onProfilePress: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var oViewModel = this.getView().getModel();

            if (!oDataModel) {
                MessageBox.error("OData model not found. Please check your manifest configuration.");
                return;
            }

            BusyIndicator.show(0);

            // First check if we already have profile data in the model
            // var oExistingProfile = oViewModel.getProperty("/profile");
            // if (oExistingProfile && oExistingProfile.employee_ID) {
            //     BusyIndicator.hide();
            //     this._openProfileDialog();
            //     return;
            // }

            // If not, load it from the backend
            oDataModel.read("/MyProfile", {
                success: function (oData) {
                    BusyIndicator.hide();

                    // Format profile data
                    var oProfile = {
                        // employee_ID: oData.employee_ID || oData.employee_ID || "",
                        firstName: oData.FirstName || oData.firstName || "",
                        lastName: oData.LastName || oData.lastName || "",
                        email: oData.Email || oData.email || "",
                        managerName: oData.ManagerName || oData.managerName || "",
                        managerEmail: oData.ManagerEmail || oData.managerEmail || "",
                        activeStatus: oData.ActiveStatus || oData.activeStatus || "",
                        changedBy: oData.ChangedBy || oData.changedBy || "",
                        userRole: oData.UserRole || oData.userRole || ""
                    };

                    oViewModel.setProperty("/profile", oProfile);

                    // Set employee name in the page header if available
                    var sEmployeeName = oProfile.firstName + " " + oProfile.lastName;
                    var oEmployeeNameText = this.getView().byId("employeeNameText");
                    if (oEmployeeNameText) {
                        oEmployeeNameText.setText(sEmployeeName);
                    }

                    this._openProfileDialog();
                }.bind(this),
                error: function (oError) {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to load profile data. Please try again later.");
                    console.error("Error loading profile:", oError);
                }
            });
        },

        _openProfileDialog: function () {
            if (!this._oProfileDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.ProfileDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(this._oProfileDialog);
                    this._oProfileDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading profile dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oProfileDialog.open();
            }
        },

        onCloseProfileDialog: function () {
            if (this._oProfileDialog) {
                this._oProfileDialog.close();
            }
        },

        // Function to validate daily hours with backend
        _validateDailyHoursWithBackend: function (sDate) {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");

            if (!oDataModel) {
                return Promise.reject("OData model not available");
            }

            return new Promise(function (resolve, reject) {
                oDataModel.callFunction("/validateDailyHours", {
                    method: "GET",
                    urlParameters: {
                        "date": sDate
                    },
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        }
    });
});



UPDATED CODE 1

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/type/Float",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/m/Input",
    "sap/m/Button",
    "sap/ui/core/Item",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/m/DateRangeSelection",
    "sap/m/CheckBox",
    "sap/m/TextArea",
    "sap/m/SegmentedButton",
    "sap/m/SegmentedButtonItem",
    "sap/m/Popover",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/ObjectStatus",
    "sap/m/Text",
    "sap/m/ToolbarSpacer",
    "sap/m/OverflowToolbar",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Menu",
    "sap/m/MenuItem",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageBox, MessageToast, JSONModel, FloatType, Dialog, VBox, Label,
    ComboBox, Input, Button, Item, History, Fragment, DateRangeSelection, CheckBox, TextArea,
    SegmentedButton, SegmentedButtonItem, Popover, List, StandardListItem, ObjectStatus,
    Text, ToolbarSpacer, OverflowToolbar, Table, Column, ColumnListItem, Menu, MenuItem, BusyIndicator) {
    "use strict";

    return Controller.extend("admin.com.admin.controller.Employee", {
        onInit: function () {
            this._initializeModel();
            this._initializeCurrentWeek();
            this._loadData();
            this._oRouter = this.getOwnerComponent().getRouter();
            if (!this._oRouter) {
                this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            }

            // Attach route matched event to reload data when navigating back
            this._oRouter.getRoute("employee").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Reload data every time the route is matched
            this._loadData();
        },

        // Formatter function to calculate row total
        formatRowTotal: function (monday, tuesday, wednesday, thursday, friday, saturday, sunday) {
            var total = (parseFloat(monday) || 0) +
                (parseFloat(tuesday) || 0) +
                (parseFloat(wednesday) || 0) +
                (parseFloat(thursday) || 0) +
                (parseFloat(friday) || 0) +
                (parseFloat(saturday) || 0) +
                (parseFloat(sunday) || 0);
            return total.toFixed(2);
        },

        // Format day with date
        formatDayWithDate: function (day, formattedDate) {
            return day + " (" + formattedDate + ")";
        },

        _initializeModel: function () {
            var oModel = new JSONModel({
                currentWeek: "",
                totalWeekHours: "0.00",
                isSubmitted: false,
                timeEntriesCount: "0",
                commentsCount: "0",
                selectedDate: null,
                isCurrentWeek: true,
                assignedProjects: [],
                availableActivities: [],
                nonProjectTypes: [],
                workTypes: [
                    { type: "DESIGN", name: "Designing" },
                    { type: "DEVELOP", name: "Developing" },
                    { type: "TEST", name: "Testing" },
                    { type: "DEPLOY", name: "Deployment" },
                    { type: "MEETING", name: "Meetings" },
                    { type: "DOCUMENTATION", name: "Documentation" },
                    { type: "LEAVE", name: "Leave" },
                    { type: "TRAINING", name: "Training" }
                ],
                timeEntries: [],
                dailyTotals: {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                },
                dailyTotalsArray: [],
                dailyComments: [
                    { day: "monday", comment: "", lastUpdated: "" },
                    { day: "Tuesday", comment: "", lastUpdated: "" },
                    { day: "Wednesday", comment: "", lastUpdated: "" },
                    { day: "Thursday", comment: "", lastUpdated: "" },
                    { day: "Friday", comment: "", lastUpdated: "" },
                    { day: "Saturday", comment: "", lastUpdated: "" },
                    { day: "Sunday", comment: "", lastUpdated: "" }
                ],
                projectEngagement: [],
                weekDates: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: "",
                    mondayFormatted: "",
                    tuesdayFormatted: "",
                    wednesdayFormatted: "",
                    thursdayFormatted: "",
                    fridayFormatted: "",
                    saturdayFormatted: "",
                    sundayFormatted: ""
                },
                editEntry: {},
                newEntry: {
                    selectedDate: "",
                    projectId: "",
                    workType: "",
                    hours: "8",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                },
                newDailyComment: {
                    day: "",
                    comment: ""
                },
                employeeProjectHours: [],
                employeeProjectDurations: [],
                currentMonth: "",
                projects: [],
                selectedProject: "",
                dueDateStart: null,
                dueDateEnd: null,
                selectedWorkType: "DESIGN",
                statusOptions: [
                    { key: "todo", text: "To Do" },
                    { key: "inprogress", text: "In Progress" },
                    { key: "done", text: "Done" },
                    { key: "review", text: "Under Review" }
                ],
                selectedStatus: "todo",
                priorityOptions: [
                    { key: "low", text: "Low" },
                    { key: "medium", text: "Medium" },
                    { key: "high", text: "High" },
                    { key: "urgent", text: "Urgent" }
                ],
                selectedPriority: "medium",
                needInput: false,
                newCommentText: "",
                existingComments: [],
                editCommentText: "",
                editCommentId: "",
                editDayHours: {
                    day: "",
                    hours: 0,
                    entryId: "",
                    dayProperty: ""
                },
                profile: {
                    employee_ID: "",
                    firstName: "",
                    lastName: "",
                    email: "",
                    managerName: "",
                    managerEmail: "",
                    activeStatus: "",
                    changedBy: "",
                    userRole: ""
                },
                dailySummary: []
            });
            this.getView().setModel(oModel);
        },

        _loadData: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var that = this;
            var oViewModel = this.getView().getModel();

            // Show loading indicator
            BusyIndicator.show(0);

            Promise.all([
                this._readODataEntity(oDataModel, "/MyProfile"),
                this._readODataEntity(oDataModel, "/MyProjects"),
                this._readODataEntity(oDataModel, "/MyTimesheets"),
                this._readODataEntity(oDataModel, "/AvailableActivities"),
                this._readODataEntity(oDataModel, "/AvailableNonProjectTypes"),
                this._readODataEntity(oDataModel, "/MyDailySummary")
            ]).then(function (aResults) {
                // Process profile data
                var oProfileData = aResults[0];
                if (oProfileData) {
                    var oProfile = {
                        // employee_ID: oProfileData.employee_ID || oProfileData.employee_ID || "",
                        firstName: oProfileData.FirstName || oProfileData.firstName || "",
                        lastName: oProfileData.LastName || oProfileData.lastName || "",
                        email: oProfileData.Email || oProfileData.email || "",
                        managerName: oProfileData.ManagerName || oProfileData.managerName || "",
                        managerEmail: oProfileData.ManagerEmail || oProfileData.managerEmail || "",
                        activeStatus: oProfileData.ActiveStatus || oProfileData.activeStatus || "",
                        changedBy: oProfileData.ChangedBy || oProfileData.changedBy || "",
                        userRole: oProfileData.UserRole || oProfileData.userRole || ""
                    };
                    oViewModel.setProperty("/profile", oProfile);

                    // Set employee name in the page header if available
                    var sEmployeeName = oProfile.firstName + " " + oProfile.lastName;
                    var oEmployeeNameText = that.getView().byId("employeeNameText");
                    if (oEmployeeNameText) {
                        oEmployeeNameText.setText(sEmployeeName);
                    }
                }

                // Process projects data - enhanced to match your image structure
                var aProjects = aResults[1] && aResults[1].value ? aResults[1].value : (aResults[1] && aResults[1].results ? aResults[1].results : []);
                var aFormattedProjects = aProjects.map(function (project) {
                    return {
                        projectId: project.projectID || project.projectId || project.ID || project.project_ID,
                        projectCode: project.projectCode || project.code || "",
                        projectName: project.Project || project.projectName || project.Name || project.projectName,
                        managerName: project.managerName || project.Manager || project.Manager_Name || "Not Assigned",
                        status: project.status || project.Status || "Active",
                        startDate: project.StartDate || project.startDate || project.Start_Date,
                        endDate: project.EndDate || project.endDate || project.End_Date,
                        allocatedHours: project.AllocateHours || project.allocatedHours || project.Allocated_Hours || 0,
                        bookedHours: project.BookedHours || project.bookedHours || 0,
                        remainingHours: project.RemainingHours || project.remainingHours || 0,
                        utilization: project.Utilization || project.utilization || 0,
                        duration: project.Duration || project.duration || 0,
                        daysRemaining: project.DaysRemaining || project.daysRemaining || 0,
                        timelineStatus: project.TimelineStatus || project.timelineStatus || "Active"
                    };
                });

                oViewModel.setProperty("/assignedProjects", aFormattedProjects);
                oViewModel.setProperty("/projects", aFormattedProjects.map(function (p) {
                    return {
                        id: p.projectId,
                        name: p.projectName,
                        code: p.projectCode
                    };
                }));

                if (aFormattedProjects.length > 0) {
                    oViewModel.setProperty("/selectedProject", aFormattedProjects[0].projectId);
                }

                // Process available activities
                var aAvailableActivities = aResults[3] && aResults[3].results ? aResults[3].results : [];
                var aFormattedActivities = aAvailableActivities.map(function (activity) {
                    return {
                        activityId: activity.activityId || activity.ID,
                        activityName: activity.activityName || activity.Name,
                        description: activity.description || activity.Description
                    };
                });
                oViewModel.setProperty("/availableActivities", aFormattedActivities);

                var aNonProjectTypes = aResults[4] && aResults[4].results ? aResults[4].results : [];
                var aFormattedNonProjectTypes = aNonProjectTypes.map(function (type) {
                    return {
                        typeId: type.typeId || type.ID,
                        typeName: type.typeName || type.Name,
                        description: type.description || type.Description
                    };
                });
                oViewModel.setProperty("/nonProjectTypes", aFormattedNonProjectTypes);

                // Process timesheets data
                var aTimesheets = aResults[2] && aResults[2].results ? aResults[2].results : [];
                var aFormattedTimesheets = aTimesheets.map(function (timesheet) {
                    var oDayHours = {
                        monday: parseFloat(timesheet.monday || timesheet.Monday || 0),
                        tuesday: parseFloat(timesheet.tuesday || timesheet.Tuesday || 0),
                        wednesday: parseFloat(timesheet.wednesday || timesheet.Wednesday || 0),
                        thursday: parseFloat(timesheet.thursday || timesheet.Thursday || 0),
                        friday: parseFloat(timesheet.friday || timesheet.Friday || 0),
                        saturday: parseFloat(timesheet.saturday || timesheet.Saturday || 0),
                        sunday: parseFloat(timesheet.sunday || timesheet.Sunday || 0)
                    };

                    return {
                        id: timesheet.id || timesheet.ID,
                        projectId: timesheet.projectId || timesheet.project_ID || timesheet.projectID,
                        projectName: timesheet.projectName || "",
                        workTypeName: timesheet.activity || timesheet.task || timesheet.workTypeName,
                        workType: that._mapActivityToWorkType(timesheet.activity || timesheet.task || timesheet.workTypeName),
                        comment: timesheet.taskDetails || timesheet.comment || timesheet.Description || "",
                        status: timesheet.status || timesheet.Status || "Pending",
                        isApproved: (timesheet.status === "Approved") || (timesheet.Status === "Approved") || false,
                        isFutureDay: false,
                        dailyComments: {
                            monday: timesheet.mondayComment || timesheet.monday_Comment || "",
                            tuesday: timesheet.tuesdayComment || timesheet.Tuesday_Comment || "",
                            wednesday: timesheet.wednesdayComment || timesheet.Wednesday_Comment || "",
                            thursday: timesheet.thursdayComment || timesheet.Thursday_Comment || "",
                            friday: timesheet.fridayComment || timesheet.Friday_Comment || "",
                            saturday: timesheet.saturdayComment || timesheet.Saturday_Comment || "",
                            sunday: timesheet.sundayComment || timesheet.Sunday_Comment || ""
                        },
                        ...oDayHours
                    };
                });

                oViewModel.setProperty("/timeEntries", aFormattedTimesheets);

                // Process daily summary data
                var aDailySummary = aResults[5] && aResults[5].results ? aResults[5].results : [];
                var oDailyTotals = {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                };

                // Calculate daily totals from time entries
                aFormattedTimesheets.forEach(function (entry) {
                    oDailyTotals.monday += parseFloat(entry.monday) || 0;
                    oDailyTotals.tuesday += parseFloat(entry.tuesday) || 0;
                    oDailyTotals.wednesday += parseFloat(entry.wednesday) || 0;
                    oDailyTotals.thursday += parseFloat(entry.thursday) || 0;
                    oDailyTotals.friday += parseFloat(entry.friday) || 0;
                    oDailyTotals.saturday += parseFloat(entry.saturday) || 0;
                    oDailyTotals.sunday += parseFloat(entry.sunday) || 0;
                });

                oViewModel.setProperty("/dailyTotals", oDailyTotals);
                oViewModel.setProperty("/dailySummary", aDailySummary);

                // Check if timesheet is submitted
                var bIsSubmitted = aFormattedTimesheets.length > 0 &&
                    aFormattedTimesheets.every(function (entry) {
                        return entry.status === "Submitted" || entry.status === "Approved";
                    });
                oViewModel.setProperty("/isSubmitted", bIsSubmitted);

                that._calculateAllTotals();
                that._updateCounts();
                that._updateProjectEngagement();
                that._updateReportsData();

                // Force refresh to ensure UI updates
                oViewModel.refresh(true);

                // Hide loading indicator
                BusyIndicator.hide();

                // Show success message
                MessageToast.show("Timesheet data loaded successfully");
            }).catch(function (oError) {
                BusyIndicator.hide();
                MessageBox.error("Failed to load timesheet data");
                console.error("Error loading data:", oError);
            });
        },

        _readODataEntity: function (oModel, sPath) {
            return new Promise(function (resolve, reject) {
                oModel.read(sPath, {
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        console.warn("Error reading " + sPath + ":", oError);
                        resolve({}); // Resolve with empty object instead of rejecting
                    }
                });
            });
        },

        _mapActivityToWorkType: function (activity) {
            var activityMap = {
                "Designing": "DESIGN",
                "Developing": "DEVELOP",
                "Testing": "TEST",
                "Deployment": "DEPLOY",
                "Meetings": "MEETING",
                "Documentation": "DOCUMENTATION",
                "Leave": "LEAVE",
                "Training": "TRAINING"
            };

            return activityMap[activity] || "DEVELOP";
        },

        _initializeCurrentWeek: function () {
            var today = new Date();
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            oModel.setProperty("/isCurrentWeek", true);
            this._updateWeekDates(today);

            var months = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            oModel.setProperty("/currentMonth", months[today.getMonth()] + " " + today.getFullYear());
        },

        _updateWeekDates: function (oDate) {
            var oModel = this.getView().getModel();
            var startDate = new Date(oDate);
            var day = startDate.getDay();
            var diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            var monday = new Date(startDate.setDate(diff));
            var tuesday = new Date(monday);
            tuesday.setDate(monday.getDate() + 1);
            var wednesday = new Date(monday);
            wednesday.setDate(monday.getDate() + 2);
            var thursday = new Date(monday);
            thursday.setDate(monday.getDate() + 3);
            var friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            var saturday = new Date(monday);
            saturday.setDate(monday.getDate() + 5);
            var sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            var oWeekDates = {
                monday: this._formatDateForModel(monday),
                tuesday: this._formatDateForModel(tuesday),
                wednesday: this._formatDateForModel(wednesday),
                thursday: this._formatDateForModel(thursday),
                friday: this._formatDateForModel(friday),
                saturday: this._formatDateForModel(saturday),
                sunday: this._formatDateForModel(sunday),
                mondayFormatted: this._formatDateDisplay(monday),
                tuesdayFormatted: this._formatDateDisplay(tuesday),
                wednesdayFormatted: this._formatDateDisplay(wednesday),
                thursdayFormatted: this._formatDateDisplay(thursday),
                fridayFormatted: this._formatDateDisplay(friday),
                saturdayFormatted: this._formatDateDisplay(saturday),
                sundayFormatted: this._formatDateDisplay(sunday)
            };
            var sCurrentWeek = this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday) + " " + sunday.getFullYear();
            oModel.setProperty("/weekDates", oWeekDates);
            oModel.setProperty("/currentWeek", sCurrentWeek);

            var today = new Date();
            var isCurrentWeek = today >= monday && today <= sunday;
            oModel.setProperty("/isCurrentWeek", isCurrentWeek);

            Object.keys(oWeekDates).forEach(function (sDay) {
                if (sDay.endsWith("Formatted")) return;
                var dayDate = new Date(oWeekDates[sDay]);
                var isFuture = dayDate > today;
                oWeekDates[sDay + "IsFuture"] = isFuture;
            });
            oModel.setProperty("/weekDates", oWeekDates);
        },

        _formatDateForModel: function (oDate) {
            return oDate.getFullYear() + "-" +
                ("0" + (oDate.getMonth() + 1)).slice(-2) + "-" +
                ("0" + oDate.getDate()).slice(-2);
        },

        _formatDateDisplay: function (oDate) {
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[oDate.getMonth()] + " " + ("0" + oDate.getDate()).slice(-2);
        },

        _updateCounts: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aComments = oModel.getProperty("/dailyComments");
            var iCommentsWithText = aComments.filter(function (comment) {
                return comment.comment && comment.comment.trim() !== "";
            }).length;
            oModel.setProperty("/timeEntriesCount", aEntries.length.toString());
            oModel.setProperty("/commentsCount", iCommentsWithText.toString());
        },

        ontaskDetailPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();

            var oWeekDates = oModel.getProperty("/weekDates");

            var aDays = [
                { day: "monday", date: oWeekDates.mondayFormatted, hours: oEntry.monday, comment: oEntry.dailyComments.monday },
                { day: "Tuesday", date: oWeekDates.tuesdayFormatted, hours: oEntry.tuesday, comment: oEntry.dailyComments.tuesday },
                { day: "Wednesday", date: oWeekDates.wednesdayFormatted, hours: oEntry.wednesday, comment: oEntry.dailyComments.wednesday },
                { day: "Thursday", date: oWeekDates.thursdayFormatted, hours: oEntry.thursday, comment: oEntry.dailyComments.thursday },
                { day: "Friday", date: oWeekDates.fridayFormatted, hours: oEntry.friday, comment: oEntry.dailyComments.friday },
                { day: "Saturday", date: oWeekDates.saturdayFormatted, hours: oEntry.saturday, comment: oEntry.dailyComments.saturday },
                { day: "Sunday", date: oWeekDates.sundayFormatted, hours: oEntry.sunday, comment: oEntry.dailyComments.sunday }
            ];

            var aDaysWithHours = aDays.filter(function (oDay) {
                return parseFloat(oDay.hours) > 0;
            });

            var oPopover = new Popover({
                placement: sap.m.PlacementType.Auto,
                title: "task Details",
                content: new VBox({
                    items: [
                        new Text({
                            text: oEntry.comment || "No task details provided"
                        }).addStyleClass("sapUiTinyMargin"),
                        new List({
                            headerText: "Hours Worked",
                            items: aDaysWithHours.map(function (oDay) {
                                return new StandardListItem({
                                    title: oDay.day + " (" + oDay.date + ")",
                                    info: oDay.hours + " hours",
                                    description: oDay.comment || "",
                                    infoState: parseFloat(oDay.hours) >= 8 ? "Success" : "Warning"
                                });
                            })
                        })
                    ]
                }),
                footer: new OverflowToolbar({
                    content: [
                        new ToolbarSpacer(),
                        new Button({
                            text: "Close",
                            type: "Emphasized",
                            press: function () {
                                oPopover.close();
                            }
                        })
                    ]
                })
            });

            oPopover.openBy(oButton);
        },

        onInfoPress: function () {
            if (!this._oCommentOptionsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.CommentOptions",
                    controller: this
                }).then(function (oDialog) {
                    this._oCommentOptionsDialog = oDialog;
                    this.getView().addDependent(this._oCommentOptionsDialog);
                    this._initializeCommentData();
                    this._oCommentOptionsDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading comment dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._initializeCommentData();
                this._oCommentOptionsDialog.open();
            }
        },

        _initializeCommentData: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentCommentType", "daily");
            oModel.setProperty("/selectedDay", "monday");
            oModel.setProperty("/dailyCommentText", "");
            oModel.setProperty("/weeklyCommentText", "");
            oModel.setProperty("/monthlyCommentText", "");
            oModel.setProperty("/newCommentText", "");
            oModel.setProperty("/needInput", false);

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            if (aProjects && aProjects.length > 0) {
                oModel.setProperty("/selectedProject", aProjects[0].id);
            }
            if (aWorkTypes && aWorkTypes.length > 0) {
                oModel.setProperty("/selectedWorkType", aWorkTypes[0].type);
            }
            oModel.setProperty("/selectedStatus", "todo");
            oModel.setProperty("/selectedPriority", "medium");

            var today = new Date();
            var todayStr = today.getFullYear() + "-" +
                ("0" + (today.getMonth() + 1)).slice(-2) + "-" +
                ("0" + today.getDate()).slice(-2);
            oModel.setProperty("/dueDateStart", todayStr);
            oModel.setProperty("/dueDateEnd", todayStr);
        },

        onCommentTypeSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentCommentType", sKey);
            MessageToast.show("Switched to " + sKey + " comments");
        },

        onAddNewComment: function () {
            var oModel = this.getView().getModel();
            var sNewComment = oModel.getProperty("/newCommentText");
            if (!sNewComment || sNewComment.trim() === "") {
                MessageBox.error("Please enter a comment");
                return;
            }

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Just Now",
                text: sNewComment
            });
            oModel.setProperty("/existingComments", aExistingComments);
            oModel.setProperty("/newCommentText", "");
            MessageToast.show("Comment added successfully");
        },

        onSaveCommentOption: function () {
            var oModel = this.getView().getModel();
            var sCommentType = oModel.getProperty("/currentCommentType");
            if (sCommentType === "daily") {
                this._saveDailyComment();
            } else if (sCommentType === "weekly") {
                this._saveWeeklyComment();
            } else if (sCommentType === "monthly") {
                this._saveMonthlyComment();
            }
        },

        _saveCommentToTimesheet: function (sComment, sType, sProjectName, sWorkTypeName) {
            var oModel = this.getView().getModel();
            var aTimeEntries = oModel.getProperty("/timeEntries");

            var oCommentEntry = {
                id: "c" + Date.now(),
                projectId: "comment",
                projectName: sProjectName || "Comment",
                workTypeName: sWorkTypeName || (sType + " Comment"),
                workType: "COMMENT",
                status: "Approved",
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: sComment,
                isApproved: true,
                isFutureDay: false,
                isCommentEntry: true,
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };

            aTimeEntries.push(oCommentEntry);
            oModel.setProperty("/timeEntries", aTimeEntries);

            // Save to backend
            this._persistToBackend(oCommentEntry)
                .then(function () {
                    var oTable = this.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }
                    MessageToast.show(sType + " comment saved to timesheet");
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error("Failed to save comment to server");
                    console.error("Error saving comment:", oError);
                });
        },

        _saveDailyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/dailyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");
            var sStatus = oModel.getProperty("/selectedStatus");
            var sPriority = oModel.getProperty("/selectedPriority");
            var bNeedInput = oModel.getProperty("/needInput");
            var sSelectedDay = oModel.getProperty("/selectedDay");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a description for the daily comment");
                return;
            }
            if (!sProject) {
                MessageBox.error("Please select a project");
                return;
            }
            if (!sWorkType) {
                MessageBox.error("Please select a work type");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var aStatusOptions = oModel.getProperty("/statusOptions");
            var aPriorityOptions = oModel.getProperty("/priorityOptions");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });
            var oSelectedStatus = aStatusOptions.find(function (item) { return item.key === sStatus; });
            var oSelectedPriority = aPriorityOptions.find(function (item) { return item.key === sPriority; });

            var oCommentData = {
                type: "daily",
                day: sSelectedDay,
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                status: oSelectedStatus ? oSelectedStatus.text : "Unknown",
                priority: oSelectedPriority ? oSelectedPriority.text : "Unknown",
                dueDateStart: oModel.getProperty("/dueDateStart"),
                dueDateEnd: oModel.getProperty("/dueDateEnd"),
                description: sComment,
                needInput: bNeedInput,
                timestamp: new Date().toISOString()
            };

            console.log("Saving daily comment:", oCommentData);

            var sFormattedComment = "[" + sSelectedDay + "] " + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown") +
                "\nStatus: " + (oSelectedStatus ? oSelectedStatus.text : "Unknown") +
                "\nPriority: " + (oSelectedPriority ? oSelectedPriority.text : "Unknown");

            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedDay;
            });
            var now = new Date();
            var timeStr = now.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            if (oDayComment) {
                oDayComment.comment = sComment;
                oDayComment.lastUpdated = timeStr;
            } else {
                aDailyComments.push({
                    day: sSelectedDay,
                    comment: sComment,
                    lastUpdated: timeStr
                });
            }
            oModel.setProperty("/dailyComments", aDailyComments);
            this._updateCounts();

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Daily",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveWeeklyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/weeklyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a weekly summary");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });

            var oCommentData = {
                type: "weekly",
                week: oModel.getProperty("/currentWeek"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                summary: sComment,
                timestamp: new Date().toISOString()
            };

            console.log("Saving weekly comment:", oCommentData);

            var sFormattedComment = "[Weekly Summary - " + oModel.getProperty("/currentWeek") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Weekly Summary - " + new Date().toLocaleDateString(),
                text: "[WEEKLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Weekly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveMonthlyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/monthlyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");

            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a monthly review");
                return;
            }

            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });

            var oCommentData = {
                type: "monthly",
                month: oModel.getProperty("/currentMonth"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                review: sComment,
                timestamp: new Date().toISOString()
            };

            console.log("Saving monthly comment:", oCommentData);

            var sFormattedComment = "[Monthly Review - " + oModel.getProperty("/currentMonth") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");

            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Monthly Review - " + new Date().toLocaleDateString(),
                text: "[MONTHLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);

            this._saveCommentToTimesheet(
                sFormattedComment,
                "Monthly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );

            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        onCancelCommentOption: function () {
            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        onDaySelect: function (oEvent) {
            var oModel = this.getView().getModel();
            var sSelectedKey = oEvent.getParameter("selectedKey");
            oModel.setProperty("/selectedDay", sSelectedKey);

            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedKey;
            });
            if (oDayComment && oDayComment.comment) {
                oModel.setProperty("/dailyCommentText", oDayComment.comment);
            } else {
                oModel.setProperty("/dailyCommentText", "");
            }
        },

        onEditComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();

            oModel.setProperty("/editCommentText", oEntry.comment);
            oModel.setProperty("/editCommentId", oEntry.id);

            if (!this._oEditCommentDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditComment",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditCommentDialog = oDialog;
                    this.getView().addDependent(this._oEditCommentDialog);
                    this._oEditCommentDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading edit comment dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oEditCommentDialog.open();
            }
        },

        onSaveEditedComment: function () {
            var oModel = this.getView().getModel();
            var sCommentText = oModel.getProperty("/editCommentText");
            var sCommentId = oModel.getProperty("/editCommentId");
            var that = this;

            if (!sCommentText || sCommentText.trim() === "") {
                MessageBox.error("Comment cannot be empty");
                return;
            }

            var aTimeEntries = oModel.getProperty("/timeEntries");
            var oCommentEntry = aTimeEntries.find(function (entry) {
                return entry.id === sCommentId;
            });

            if (oCommentEntry) {
                oCommentEntry.comment = sCommentText;
                oModel.setProperty("/timeEntries", aTimeEntries);

                // Save to backend
                this._persistToBackend(oCommentEntry)
                    .then(function () {
                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }
                        MessageToast.show("Comment updated successfully");

                        if (that._oEditCommentDialog) {
                            that._oEditCommentDialog.close();
                        }
                    })
                    .catch(function (oError) {
                        MessageBox.error("Failed to save comment to server");
                        console.error("Error saving comment:", oError);
                    });
            }
        },

        onCancelEditComment: function () {
            if (this._oEditCommentDialog) {
                this._oEditCommentDialog.close();
            }
        },

        onDeleteComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var that = this;

            MessageBox.confirm("Are you sure you want to delete this comment?", {
                title: "Delete Comment",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = that.getView().getModel();
                        var aTimeEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aTimeEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            var oDeletedEntry = aTimeEntries[iIndex];
                            aTimeEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aTimeEntries);

                            // Delete from backend
                            var oDataModel = that.getOwnerComponent().getModel("timesheetServiceV2");
                            if (oDataModel) {
                                oDataModel.remove("/MyTimesheets('" + oDeletedEntry.id + "')", {
                                    success: function () {
                                        var oTable = that.getView().byId("timesheetTable");
                                        if (oTable && oTable.getBinding("items")) {
                                            oTable.getBinding("items").refresh();
                                        }
                                        MessageToast.show("Comment deleted successfully");
                                    },
                                    error: function (oError) {
                                        MessageBox.error("Failed to delete comment from server");
                                        console.error("Error deleting comment:", oError);
                                    }
                                });
                            } else {
                                var oTable = that.getView().byId("timesheetTable");
                                if (oTable && oTable.getBinding("items")) {
                                    oTable.getBinding("items").refresh();
                                }
                                MessageToast.show("Comment deleted successfully");
                            }
                        }
                    }
                }
            });
        },

        onCommentLiveChange: function (oEvent) {
            // This function can be used for live validation if needed
        },

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            MessageToast.show("Switched to " + sKey + " tab");
            if (sKey === "reports") {
                this._updateReportsData();
            }
        },

        onAddEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = {
                selectedDate: this._formatDateForModel(new Date()),
                projectId: "",
                workType: "",
                hours: "8",
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: "",
                taskDetails: "",
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };
            oModel.setProperty("/newEntry", oNewEntry);

            if (!this._oAddEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.AddTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oAddEntryDialog = oDialog;
                    this.getView().addDependent(this._oAddEntryDialog);
                    this._oAddEntryDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading add time entry dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oAddEntryDialog.open();
            }
        },

        onEntryDatePickerChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sDate = oDatePicker.getValue();
            if (sDate) {
                var selectedDate = new Date(sDate);
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry/selectedDate", this._formatDateForModel(selectedDate));

                var oWeekDates = oModel.getProperty("/weekDates");
                var monday = new Date(oWeekDates.monday);
                var sunday = new Date(oWeekDates.sunday);
                if (selectedDate < monday || selectedDate > sunday) {
                    MessageBox.warning("The selected date is outside the current week. Please select a date within " +
                        this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday));
                }
            }
        },

        onFragmentHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            this._calculateAllTotals();
        },

        ontaskDetailsLiveChange: function (oEvent) {
            var oTextArea = oEvent.getSource();
            var sValue = oTextArea.getValue();
            var oModel = this.getView().getModel();

            oModel.setProperty("/newEntry/taskDetails", sValue);

            if (sValue.length >= 45) {
                oTextArea.addStyleClass("sapUiFieldWarning");
            } else {
                oTextArea.removeStyleClass("sapUiFieldWarning");
            }
        },

        _saveTimeEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = oModel.getProperty("/newEntry");
            var that = this;

            if (!oNewEntry.projectId || oNewEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return false;
            }
            if (!oNewEntry.workType || oNewEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return false;
            }
            if (!oNewEntry.hours || oNewEntry.hours.trim() === "") {
                MessageBox.error("Please select hours");
                return false;
            }

            var selectedDate = new Date(oNewEntry.selectedDate);
            var dayOfWeek = selectedDate.getDay();

            var dayMap = {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday"
            };
            var dayProperty = dayMap[dayOfWeek];

            var hoursForDay = parseFloat(oNewEntry.hours) || 0;

            if (hoursForDay === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return false;
            }

            var aEntries = oModel.getProperty("/timeEntries");

            // Check for duplicate entry
            var existingEntryIndex = aEntries.findIndex(function (entry) {
                return entry.projectId === oNewEntry.projectId && entry.workType === oNewEntry.workType;
            });

            if (existingEntryIndex !== -1) {
                var existingEntry = aEntries[existingEntryIndex];

                // Check if the existing entry already has hours for this day
                if (existingEntry[dayProperty] > 0) {
                    MessageBox.error("An entry with the same project and work type already exists for this day. Please edit the existing entry instead.");
                    return false;
                }

                if (existingEntry.isApproved) {
                    this._notifyManagerOfChange(existingEntry, "Time entry modified");
                }

                existingEntry[dayProperty] = hoursForDay;
                existingEntry.comment = oNewEntry.taskDetails || "";

                if (oNewEntry.dailyComments && oNewEntry.dailyComments[dayProperty]) {
                    existingEntry.dailyComments[dayProperty] = oNewEntry.dailyComments[dayProperty];
                }

                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                this._persistToBackend(existingEntry)
                    .then(function () {
                        that._calculateAllTotals();
                        that._updateCounts();
                        that._updateProjectEngagement();
                        that._updateReportsData();

                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        MessageToast.show("Time entry updated successfully");
                    })

            } else {
                var sNewId = "temp-" + Date.now();
                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oNewEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oNewEntry.workType;
                });

                var oTimeEntry = {
                    id: sNewId,
                    projectId: oNewEntry.projectId,
                    projectName: oProject ? oProject.projectName : "",
                    workType: oNewEntry.workType,
                    workTypeName: oWorkType ? oWorkType.name : "",
                    status: "Draft",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: oNewEntry.taskDetails || "",
                    isApproved: false,
                    isFutureDay: false,
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                };

                oTimeEntry[dayProperty] = hoursForDay;

                if (oNewEntry.dailyComments && oNewEntry.dailyComments[dayProperty]) {
                    oTimeEntry.dailyComments[dayProperty] = oNewEntry.dailyComments[dayProperty];
                }

                aEntries.push(oTimeEntry);
                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                var oPromise = this._persistToBackend(oTimeEntry);

if (oPromise && typeof oPromise.then === 'function') {
    oPromise.then(function (oResponse) {
        // Update the ID with the one from the backend if it's a new entry
        if (oResponse && oResponse.ID) {
            oTimeEntry.id = oResponse.ID;
            oModel.setProperty("/timeEntries", aEntries);
        }

        that._calculateAllTotals();
        that._updateCounts();
        that._updateProjectEngagement();
        that._updateReportsData();

        var oTable = that.getView().byId("timesheetTable");
        if (oTable && oTable.getBinding("items")) {
            oTable.getBinding("items").refresh();
        }

        MessageToast.show("Time entry added successfully");
    }).catch(function (oError) {
        MessageToast.show("Failed to save time entry");
        console.error("Error saving time entry:", oError);
    });
} else {
    // If _persistToBackend doesn't return a promise, handle synchronously
    that._calculateAllTotals();
    that._updateCounts();
    that._updateProjectEngagement();
    that._updateReportsData();

    var oTable = that.getView().byId("timesheetTable");
    if (oTable && oTable.getBinding("items")) {
        oTable.getBinding("items").refresh();
    }

    MessageToast.show("Time entry added successfully");
}

            }

            return true;
        },

        onSaveNewEntry: function () {
            if (this._saveTimeEntry()) {
                this._oAddEntryDialog.close();
            }
        },

        onSaveAndNewEntry: function () {
            if (this._saveTimeEntry()) {
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry", {
                    selectedDate: this._formatDateForModel(new Date()),
                    projectId: "",
                    workType: "",
                    hours: "8",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                });
                MessageToast.show("Time entry saved. Ready for new entry.");
            }
        },

        onCancelNewEntry: function () {
            this._oAddEntryDialog.close();
        },

        onEditEntry: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();
            oModel.setProperty("/editEntry", JSON.parse(JSON.stringify(oEntry)));

            if (!this._oEditEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditEntryDialog = oDialog;
                    this.getView().addDependent(this._oEditEntryDialog);
                    this._oEditEntryDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading edit time entry dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oEditEntryDialog.open();
            }
        },

        onCancelEditEntry: function () {
            if (this._oEditEntryDialog) {
                this._oEditEntryDialog.close();
            }
        },

        onSaveEditedEntry: function () {
            var oModel = this.getView().getModel();
            var oEditEntry = oModel.getProperty("/editEntry");
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            if (!oEditEntry.projectId || oEditEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return;
            }
            if (!oEditEntry.workType || oEditEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return;
            }

            var totalHours = parseFloat(oEditEntry.monday || 0) +
                parseFloat(oEditEntry.tuesday || 0) +
                parseFloat(oEditEntry.wednesday || 0) +
                parseFloat(oEditEntry.thursday || 0) +
                parseFloat(oEditEntry.friday || 0) +
                parseFloat(oEditEntry.saturday || 0) +
                parseFloat(oEditEntry.sunday || 0);

            if (totalHours === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return;
            }

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEditEntry.id;
            });

            if (iIndex > -1) {
                if (aEntries[iIndex].isApproved) {
                    this._notifyManagerOfChange(aEntries[iIndex], "Time entry modified");
                }

                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oEditEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oEditEntry.workType;
                });

                oEditEntry.projectName = oProject ? oProject.projectName : "";
                oEditEntry.workTypeName = oWorkType ? oWorkType.name : "";

                Object.keys(oEditEntry).forEach(function (key) {
                    aEntries[iIndex][key] = oEditEntry[key];
                });

                oModel.setProperty("/timeEntries", aEntries);

                // Save to backend
                this._persistToBackend(aEntries[iIndex])
                    .then(function () {
                        that._calculateAllTotals();
                        that._updateProjectEngagement();
                        that._updateReportsData();

                        var oTable = that.getView().byId("timesheetTable");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        that._oEditEntryDialog.close();
                        MessageToast.show("Time entry updated successfully");
                    })

            }
        },

        onDeleteEntry: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext();
            if (!oContext) return;
            var oEntry = oContext.getObject();
            var that = this;

            if (oEntry.isApproved) {
                MessageBox.warning("Cannot delete approved entry. Please contact your manager.");
                return;
            }

            MessageBox.confirm("Are you sure you want to delete this time entry?", {
                title: "Delete Entry",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = that.getView().getModel();
                        var aEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            var oDeletedEntry = aEntries[iIndex];
                            aEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aEntries);

                            // Delete from backend
                            var oDataModel = that.getOwnerComponent().getModel("timesheetServiceV2");
                            if (oDataModel) {
                                oDataModel.remove("/MyTimesheets('" + oDeletedEntry.id + "')", {
                                    success: function () {
                                        that._calculateAllTotals();
                                        that._updateCounts();
                                        that._updateProjectEngagement();
                                        that._updateReportsData();

                                        var oTable = that.getView().byId("timesheetTable");
                                        if (oTable && oTable.getBinding("items")) {
                                            oTable.getBinding("items").refresh();
                                        }
                                        MessageToast.show("Time entry deleted");
                                    },
                                    error: function (oError) {
                                        MessageBox.error("Failed to delete entry from server");
                                        console.error("Error deleting entry:", oError);
                                    }
                                });
                            } else {
                                that._calculateAllTotals();
                                that._updateCounts();
                                that._updateProjectEngagement();
                                that._updateReportsData();

                                var oTable = that.getView().byId("timesheetTable");
                                if (oTable && oTable.getBinding("items")) {
                                    oTable.getBinding("items").refresh();
                                }
                                MessageToast.show("Time entry deleted");
                            }
                        }
                    }
                }
            });
        },

        onHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            this._calculateAllTotals();
            this._validateDailyHours();
        },

        _calculateAllTotals: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var fWeekTotal = 0;

            aEntries.forEach(function (oEntry) {
                fWeekTotal += parseFloat(oEntry.monday) || 0;
                fWeekTotal += parseFloat(oEntry.tuesday) || 0;
                fWeekTotal += parseFloat(oEntry.wednesday) || 0;
                fWeekTotal += parseFloat(oEntry.thursday) || 0;
                fWeekTotal += parseFloat(oEntry.friday) || 0;
                fWeekTotal += parseFloat(oEntry.saturday) || 0;
                fWeekTotal += parseFloat(oEntry.sunday) || 0;
            });

            oModel.setProperty("/totalWeekHours", fWeekTotal.toFixed(2));

            // Calculate daily totals from time entries
            var oDailyTotals = {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0
            };

            aEntries.forEach(function (oEntry) {
                oDailyTotals.monday += parseFloat(oEntry.monday) || 0;
                oDailyTotals.tuesday += parseFloat(oEntry.tuesday) || 0;
                oDailyTotals.wednesday += parseFloat(oEntry.wednesday) || 0;
                oDailyTotals.thursday += parseFloat(oEntry.thursday) || 0;
                oDailyTotals.friday += parseFloat(oEntry.friday) || 0;
                oDailyTotals.saturday += parseFloat(oEntry.saturday) || 0;
                oDailyTotals.sunday += parseFloat(oEntry.sunday) || 0;
            });

            // Update daily totals in model
            oModel.setProperty("/dailyTotals", oDailyTotals);

            this._updateProjectEngagement();
        },

        _updateProjectEngagement: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var aEngagement = [];

            aProjects.forEach(function (oProject) {
                var aProjectEntries = aEntries.filter(function (oEntry) {
                    return oEntry.projectId === oProject.projectId;
                });

                var fTotalHours = aProjectEntries.reduce(function (total, oEntry) {
                    return total + (parseFloat(oEntry.monday) || 0) +
                        (parseFloat(oEntry.tuesday) || 0) +
                        (parseFloat(oEntry.wednesday) || 0) +
                        (parseFloat(oEntry.thursday) || 0) +
                        (parseFloat(oEntry.friday) || 0) +
                        (parseFloat(oEntry.saturday) || 0) +
                        (parseFloat(oEntry.sunday) || 0);
                }, 0);

                aEngagement.push({
                    projectName: oProject.projectName,
                    managerName: oProject.managerName,
                    totalHours: fTotalHours.toFixed(2),
                    engagementDuration: this._calculateEngagementDuration(oProject.startDate, oProject.endDate),
                    status: oProject.status
                });
            }.bind(this));

            oModel.setProperty("/projectEngagement", aEngagement);
        },

        _updateReportsData: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var today = new Date();

            var aEmployeeProjectHours = aProjects.map(function (project) {
                var aProjectEntries = aEntries.filter(function (entry) {
                    return entry.projectId === project.projectId;
                });

                var bookedHours = aProjectEntries.reduce(function (total, entry) {
                    return total + (parseFloat(entry.monday) || 0) +
                        (parseFloat(entry.tuesday) || 0) +
                        (parseFloat(entry.wednesday) || 0) +
                        (parseFloat(entry.thursday) || 0) +
                        (parseFloat(entry.friday) || 0) +
                        (parseFloat(entry.saturday) || 0) +
                        (parseFloat(entry.sunday) || 0);
                }, 0);

                var utilization = project.allocatedHours > 0 ? Math.round((bookedHours / project.allocatedHours) * 100) : 0;

                return {
                    projectName: project.projectName,
                    allocatedHours: project.allocatedHours,
                    bookedHours: bookedHours,
                    remainingHours: project.allocatedHours - bookedHours,
                    utilization: utilization
                };
            });

            oModel.setProperty("/employeeProjectHours", aEmployeeProjectHours);

            var aEmployeeProjectDurations = aProjects.map(function (project) {
                var startDate = new Date(project.startDate);
                var endDate = new Date(project.endDate);
                var durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                var daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                var timelineStatus = project.status === "Completed" ? "Completed" :
                    project.status === "On Hold" ? "On Hold" :
                        daysRemaining < 0 ? "Delayed" :
                            daysRemaining < 14 ? "At Risk" : "On Track";

                return {
                    projectName: project.projectName,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    durationDays: durationDays,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    timelineStatus: timelineStatus
                };
            });

            oModel.setProperty("/employeeProjectDurations", aEmployeeProjectDurations);
        },

        _calculateEngagementDuration: function (sStartDate, sEndDate) {
            var oStart = new Date(sStartDate);
            var oEnd = new Date(sEndDate);
            var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
                (oEnd.getMonth() - oStart.getMonth());

            if (iMonths === 0) {
                var iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24));
                return iDays + " days";
            } else if (iMonths < 12) {
                return iMonths + " months";
            } else {
                var iYears = Math.floor(iMonths / 12);
                var iRemainingMonths = iMonths % 12;
                return iYears + " year" + (iYears > 1 ? "s" : "") +
                    (iRemainingMonths > 0 ? " " + iRemainingMonths + " months" : "");
            }
        },

        _validateDailyHours: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var today = new Date();
            var aWarnings = [];

            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required)");
                }
            });

            if (aWarnings.length > 0) {
                console.warn("Hours validation warnings:", aWarnings);
            }
        },

        onProjectSelect: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (oSelectedItem) {
                var oProject = oSelectedItem.getBindingContext().getObject();
                MessageToast.show("Selected project: " + oProject.projectName + " (Manager: " + oProject.managerName + ")");
            }
        },

        onProjectChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Project changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        onWorkTypeChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Work type changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        _notifyManagerOfChange: function (oEntry, sChangeDescription) {
            MessageBox.information("Change notification sent to manager: " + sChangeDescription);
            console.log("Manager notified of change:", sChangeDescription, oEntry);
        },

        onSaveDraft: function () {
            var that = this;
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");

            // If there are no entries, show a message and return
            if (aEntries.length === 0) {
                MessageToast.show("No entries to save");
                return;
            }

            BusyIndicator.show(0);

            // Create an array of promises for each entry
            var aPromises = aEntries.map(function (oEntry) {
                return that._persistToBackend(oEntry, "Draft");
            });

            Promise.all(aPromises)
                .then(function (aResults) {
                    // All entries saved successfully
                    BusyIndicator.hide();
                    MessageToast.show("Timesheet saved as draft successfully!");

                    // Refresh the data to get the latest from the backend
                    that._loadData();
                })

        },

        onSubmitApproval: function () {
            if (this._validateTimesheet()) {
                var that = this;
                var oModel = this.getView().getModel();
                var aEntries = oModel.getProperty("/timeEntries");

                // Show a loading indicator
                BusyIndicator.show(0);

                // Update all entries to "Submitted" status
                var aPromises = aEntries.map(function (oEntry) {
                    oEntry.status = "Submitted";
                    return that._persistToBackend(oEntry, "Submitted");
                });

                Promise.all(aPromises)
                    .then(function () {
                        // Now submit for approval
                        MessageBox.confirm("Are you sure you want to submit this timesheet for approval? Once submitted, changes will require manager approval.", {
                            title: "Submit for Approval",
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    // Set isSubmitted flag in model
                                    oModel.setProperty("/isSubmitted", true);

                                    BusyIndicator.hide();
                                    MessageToast.show("Timesheet submitted for approval");
                                    that._updateProjectEngagement();
                                    that._updateCounts();
                                    that._updateReportsData();

                                    var oTable = that.getView().byId("timesheetTable");
                                    if (oTable && oTable.getBinding("items")) {
                                        oTable.getBinding("items").refresh();
                                    }

                                    // Navigate to admin view
                                    if (that._oRouter) {
                                        that._oRouter.navTo("admin");
                                    } else {
                                        var oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                                        oHashChanger.setHash("/admin");
                                        MessageToast.show("Timesheet submitted. Navigation to admin page completed.");
                                    }
                                } else {
                                    BusyIndicator.hide();
                                }
                            }
                        });
                    })

            }
        },

        _validateTimesheet: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var aEntries = oModel.getProperty("/timeEntries");
            var bIsValid = true;
            var aWarnings = [];
            var aErrors = [];

            aEntries.forEach(function (oEntry, index) {
                if (!oEntry.projectId || oEntry.projectId.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Project is mandatory.");
                }
                if (!oEntry.workType || oEntry.workType.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Work Type is mandatory.");
                }
                if (parseFloat(oEntry.monday) === 0 && parseFloat(oEntry.tuesday) === 0 &&
                    parseFloat(oEntry.wednesday) === 0 && parseFloat(oEntry.thursday) === 0 &&
                    parseFloat(oEntry.friday) === 0 && parseFloat(oEntry.saturday) === 0 &&
                    parseFloat(oEntry.sunday) === 0) {
                    aErrors.push("Entry " + (index + 1) + ": At least one day's hours must be entered.");
                }
            });

            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required for past dates)");
                }

                if (fHours > 24) {
                    bIsValid = false;
                    aErrors.push(sDay + " has more than 24 hours. Please correct the entries.");
                    return false;
                }
            });



            if (aWarnings.length > 0) {
                MessageBox.warning(aWarnings.join("\n") + "\n\nYou can still submit, but please ensure you meet the 8-hour requirement for past dates.", {
                    title: "Validation Warnings",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.CANCEL) {
                            bIsValid = false;
                        }
                    }
                });
            }

            return bIsValid;
        },

        onViewReports: function () {
            var oModel = this.getView().getModel();
            var aEngagement = oModel.getProperty("/projectEngagement");
            var sReport = "Progress Reports:\n\n";

            aEngagement.forEach(function (oProject) {
                sReport += "Project: " + oProject.projectName + "\n";
                sReport += "Manager: " + oProject.managerName + "\n";
                sReport += "Total Hours: " + oProject.totalHours + "\n";
                sReport += "Duration: " + oProject.engagementDuration + "\n";
                sReport += "Status: " + oProject.status + "\n\n";
            });

            MessageBox.information(sReport);
        },

        onPreviousWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() - 7);
            this._updateWeekDates(mondayDate);
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));
            this._showNotification("Data sent to manager", "sap-icon://notification-2");
        },

        onCurrentWeekTS: function () {
            var today = new Date();
            this._updateWeekDates(today);
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            MessageToast.show("Navigated to current week");
        },

        onNextWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() + 7);
            this._updateWeekDates(mondayDate);
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));

            var aEntries = oModel.getProperty("/timeEntries");
            var allZeroHours = aEntries.every(function (entry) {
                return parseFloat(entry.monday) === 0 &&
                    parseFloat(entry.tuesday) === 0 &&
                    parseFloat(entry.wednesday) === 0 &&
                    parseFloat(entry.thursday) === 0 &&
                    parseFloat(entry.friday) === 0 &&
                    parseFloat(entry.saturday) === 0 &&
                    parseFloat(entry.sunday) === 0;
            });

            if (allZeroHours) {
                oModel.setProperty("/timeEntries", []);
                MessageToast.show("All entries had 0 hours. Table has been cleared.");
            } else {
                var hasLeaveEntry = aEntries.some(function (entry) {
                    return entry.workType === "LEAVE";
                });

                if (!hasLeaveEntry) {
                    var oProject = oModel.getProperty("/assignedProjects")[0];
                    if (oProject) {
                        aEntries.push({
                            id: "leave-" + Date.now(),
                            projectId: oProject.projectId,
                            projectName: oProject.projectName,
                            workType: "LEAVE",
                            workTypeName: "Leave",
                            status: "Pending",
                            monday: 0,
                            tuesday: 0,
                            wednesday: 0,
                            thursday: 0,
                            friday: 0,
                            saturday: 0,
                            sunday: 0,
                            comment: "Leave entry",
                            isApproved: false,
                            isFutureDay: false,
                            dailyComments: {
                                monday: "",
                                tuesday: "",
                                wednesday: "",
                                thursday: "",
                                friday: "",
                                saturday: "",
                                sunday: ""
                            }
                        });
                        oModel.setProperty("/timeEntries", aEntries);
                        MessageToast.show("Leave entry added for the week.");
                    }
                }
            }

            var oTable = this.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
        },

        onDatePickerChange: function (oEvent) {
            var sDate = oEvent.getParameter("value");
            if (sDate) {
                var selectedDate = new Date(sDate);
                this._updateWeekDates(selectedDate);
                MessageToast.show("Week updated for selected date: " + sDate);
            }
        },

        onPreviousWeek: function () {
            this.onPreviousWeekTS();
        },

        onNextWeek: function () {
            this.onNextWeekTS();
        },

        onToday: function () {
            this.onCurrentWeekTS();
        },

        onSettingsPress: function () {
            MessageBox.information("Timesheet Settings:\n\n- Working hours: 8 hours/day\n- Future bookings allowed for Leave/Training only\n- Manager notifications for approved entry changes");
        },

        onLogoutPress: function () {
            MessageBox.confirm("Are you sure you want to logout?", {
                title: "Logout",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        MessageToast.show("Logged out successfully");
                    }
                }
            });
        },

        _showNotification: function (sMessage, sIcon) {
            var oNotification = new sap.m.Dialog({
                title: "Notification",
                icon: sIcon || "sap-icon://notification-2",
                content: new sap.m.Text({
                    text: sMessage
                }),
                beginButton: new sap.m.Button({
                    text: "OK",
                    press: function () {
                        oNotification.close();
                    }
                }),
                afterClose: function () {
                    oNotification.destroy();
                }
            });

            oNotification.addStyleClass("amazonNotification");
            oNotification.open();
        },

        // Day overflow functionality
        onDayOverflowPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var sDay = oButton.data("day");
            var oContext = oButton.getBindingContext();
            if (!oContext) {
                MessageToast.show("Unable to get entry data");
                return;
            }

            var oEntry = oContext.getObject();
            this._currentEditEntry = oEntry;
            this._currentEditDay = sDay;

            if (!this._oDayOverflowMenu) {
                this._oDayOverflowMenu = new Menu({
                    items: [
                        new MenuItem({
                            text: "Edit",
                            icon: "sap-icon://edit",
                            press: this.onEditDayHours.bind(this)
                        }),
                        new MenuItem({
                            text: "Delete",
                            icon: "sap-icon://delete",
                            press: this.onDeleteDayHours.bind(this)
                        })
                    ]
                });
                this.getView().addDependent(this._oDayOverflowMenu);
            }

            this._oDayOverflowMenu.openBy(oButton);
        },

        onEditDayHours: function () {
            var oEntry = this._currentEditEntry;
            var sDay = this._currentEditDay;

            if (!oEntry || !sDay) {
                MessageToast.show("Unable to edit. Please try again.");
                return;
            }

            var fCurrentHours = parseFloat(oEntry[sDay]) || 0;

            var oDialog = new Dialog({
                title: "Edit Hours - " + this._capitalize(sDay),
                contentWidth: "300px",
                content: [
                    new VBox({
                        items: [
                            new Label({
                                text: "Project: " + oEntry.projectName,
                                class: "sapUiTinyMarginBottom"
                            }),
                            new Label({
                                text: "Work Type: " + oEntry.workTypeName,
                                class: "sapUiTinyMarginBottom"
                            }),
                            new Label({
                                text: "Enter Hours (0-15):",
                                class: "sapUiSmallMarginTop"
                            }),
                            new Input("editHoursInput", {
                                type: "Number",
                                value: fCurrentHours.toString(),
                                placeholder: "Enter hours (0-24)",
                                liveChange: function (oEvt) {
                                    var fValue = parseFloat(oEvt.getParameter("value"));
                                    var oInput = oEvt.getSource();

                                    if (isNaN(fValue) || fValue < 0 || fValue > 24) {
                                        oInput.setValueState("Error");
                                        oInput.setValueStateText("Please enter a value between 0 and 24");
                                    } else {
                                        oInput.setValueState("None");
                                    }
                                }
                            })
                        ]
                    })
                ],
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: function () {
                        var oInput = sap.ui.getCore().byId("editHoursInput");
                        var fNewHours = parseFloat(oInput.getValue());

                        if (isNaN(fNewHours) || fNewHours < 0 || fNewHours > 24) {
                            MessageBox.error("Please enter a valid value between 0 and 24");
                            return;
                        }

                        this._saveEditedDayHoursAuto(oEntry, sDay, fNewHours);
                        oDialog.close();
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            this.getView().addDependent(oDialog);
            oDialog.open();

            setTimeout(function () {
                sap.ui.getCore().byId("editHoursInput").focus();
            }, 100);
        },

        _saveEditedDayHoursAuto: function (oEntry, sDay, fNewHours) {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEntry.id;
            });

            if (iIndex === -1) {
                MessageBox.error("Entry not found");
                return;
            }

            aEntries[iIndex][sDay] = fNewHours;

            if (aEntries[iIndex].isApproved) {
                this._notifyManagerOfChange(
                    aEntries[iIndex],
                    "Hours updated for " + this._capitalize(sDay) + " from " +
                    oEntry[sDay] + " to " + fNewHours
                );
            }

            oModel.setProperty("/timeEntries", aEntries);

            // Save to backend
    Promise.resolve(this._persistToBackend(aEntries))
                       .then(function (oResponse) {
            // Recalculate totals
            that._calculateAllTotals();
            
            // Refresh table
            var oTable = that.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
            
            // Show success message
            MessageToast.show(
                that._capitalize(sDay) + " hours updated to " + fNewHours.toFixed(2) +
                " for " + oEntry.projectName
            );
            
            // Close dialog
            oDialog.close();
        })
        .catch(function (oError) {
            MessageToast.show("Failed to save hours");
            console.error("Error saving hours:", oError);
        });
},


        onDeleteDayHours: function () {
            var oEntry = this._currentEditEntry;
            var sDay = this._currentEditDay;

            if (!oEntry || !sDay) {
                MessageToast.show("Unable to delete. Please try again.");
                return;
            }

            var fCurrentHours = parseFloat(oEntry[sDay]) || 0;

            MessageBox.confirm(
                "Delete " + fCurrentHours.toFixed(2) + " hours for " +
                this._capitalize(sDay) + "?\n\nProject: " + oEntry.projectName +
                "\nWork Type: " + oEntry.workTypeName,
                {
                    title: "Confirm Deletion",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            this._deleteHoursAuto(oEntry, sDay);
                        }
                    }.bind(this)
                }
            );
        },

        _deleteHoursAuto: function (oEntry, sDay) {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var that = this;

            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEntry.id;
            });

            if (iIndex === -1) {
                MessageBox.error("Entry not found");
                return;
            }

            var fOldHours = aEntries[iIndex][sDay];
            aEntries[iIndex][sDay] = 0;

            if (aEntries[iIndex].isApproved) {
                this._notifyManagerOfChange(
                    aEntries[iIndex],
                    "Hours deleted for " + this._capitalize(sDay) +
                    " (was " + fOldHours + " hours)"
                );
            }

            oModel.setProperty("/timeEntries", aEntries);

            // Save to backend
            this._persistToBackend(aEntries[iIndex])
                .then(function () {
                    that._calculateAllTotals();

                    var oTable = that.getView().byId("timesheetTable");
                    if (oTable && oTable.getBinding("items")) {
                        oTable.getBinding("items").refresh();
                    }

                    MessageToast.show(
                        that._capitalize(sDay) + " hours deleted for " + oEntry.projectName
                    );
                })
                .catch(function (oError) {
                    MessageBox.error("Failed to delete hours from server");
                    console.error("Error deleting hours:", oError);
                });
        },

        _persistToBackend: function (sActionType) {
    var oView = this.getView();
    var oDialog = oView.byId("addEntryDialog") || sap.ui.getCore().byId("addEntryDialog");
    var oModel = this.getView().getModel("timesheetServiceV2"); // use correct model

    if (!oDialog) {
        sap.m.MessageBox.error("Add Entry Dialog not found.");
        return;
    }

    // ✅ Get control references from fragment (using sap.ui.getCore())
    var oDatePicker = sap.ui.getCore().byId("entryDatePicker");
    var oProjectCombo = sap.ui.getCore().byId("projectComboBox");
    var oWorkTypeCombo = sap.ui.getCore().byId("workTypeComboBox");
    var oTaskInput = sap.ui.getCore().byId("taskDetailsInput");
    var oHoursCombo = sap.ui.getCore().byId("hoursComboBox");

    // ✅ Check if controls exist
    if (!oDatePicker || !oProjectCombo || !oWorkTypeCombo || !oTaskInput || !oHoursCombo) {
        sap.m.MessageToast.show("Some input fields are missing in the dialog.");
        return;
    }

    // ✅ Get actual values
    var sDate = oDatePicker.getDateValue(); // returns JS Date object
    var sProjectId = oProjectCombo.getSelectedKey();
    var sWorkType = oWorkTypeCombo.getSelectedKey();
    var sTaskDetails = oTaskInput.getValue();
    var sHours = oHoursCombo.getSelectedKey();

    // ✅ Basic validation
    if (!sDate || !sProjectId || !sWorkType || !sHours || !sTaskDetails) {
        sap.m.MessageToast.show("Please fill in all mandatory fields.");
        return;
    }

    // ✅ Determine status based on action type
    var sStatus = sActionType === "submit" ? "Submitted" : "Draft";

    // ✅ Build payload (now correctly converting Date to YYYY-MM-DD)
    var oPayload = {
        workDate: sDate.toISOString().split("T")[0],
        project_ID: sProjectId,
        hoursWorked: parseFloat(sHours),
        task: sWorkType,
        taskDetails: sTaskDetails,
        status: sStatus,
        isBillable: true
    };

    sap.ui.core.BusyIndicator.show(0);

    // ✅ Create entry in backend
    oModel.create("/Timesheets", oPayload, {
        success: function (oData) {
            sap.ui.core.BusyIndicator.hide();
            var sMsg = sStatus === "Submitted"
                ? "Time entry submitted successfully!"
                : "Time entry saved as draft successfully!";
            sap.m.MessageToast.show(sMsg);
            oModel.refresh(true);
            oDialog.close();
        },
        error: function (oError) {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageBox.error("Failed to save entry. Please try again.");
            console.error(oError);
        }
    });
},



        _persistToBackendoo: function (oEntry, sStatus) {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");


            if (!oDataModel) {
                console.warn("OData model not available for persistence");
                return Promise.reject("OData model not available");
            }

            // Get current profile for employee ID
            var oProfile = this.getView().getModel().getProperty("/profile");
            // var semployee_ID = oProfile.employee_ID;

            // if (!semployee_ID) {
            //     console.warn("Employee ID not found in profile");
            //     return Promise.reject("Employee ID not available");
            // }

            // Construct data payload expected by backend - FIXED to match OData entity properties
            // var oData = {
            //     // employee_ID: semployee_ID,
            //     ProjectID: oEntry.projectId,
            //     ActivityID: oEntry.workType,
            //     WorkDate: this._getCurrentWeekMonday(),
            //     Task: oEntry.workTypeName || "General Task",
            //     TaskDetails: oEntry.comment || "",
            //     HoursWorked: this._calculateTotalHours(oEntry),
            //     Monday: parseFloat(oEntry.monday) || 0,
            //     Tuesday: parseFloat(oEntry.tuesday) || 0,
            //     Wednesday: parseFloat(oEntry.wednesday) || 0,
            //     Thursday: parseFloat(oEntry.thursday) || 0,
            //     Friday: parseFloat(oEntry.friday) || 0,
            //     Saturday: parseFloat(oEntry.saturday) || 0,
            //     Sunday: parseFloat(oEntry.sunday) || 0,
            //     Status: sStatus || oEntry.status || "Draft",
            //     IsBillable: true
            // };

            // Add ID for updates
            if (oEntry.id && !oEntry.id.startsWith("temp")) {
                oData.ID = oEntry.id;
            }

            console.log("📤 Final Payload Sent to Backend:",);

            // Promise-based backend persistence
            return new Promise(function (resolve, reject) {
                if (!oEntry.id || oEntry.id.startsWith("temp") || oEntry.id.startsWith("leave-")) {
                    // CREATE new record
                    oDataModel.create("/MyTimesheets", {
                        success: function (oResponse) {
                            console.log("✅ Successfully created entry:", oResponse);
                            resolve(oResponse);
                        },
                        error: function (oError) {
                            console.error("❌ Error creating entry:", oError);
                            reject(oError);
                        }
                    });
                } else {
                    // UPDATE existing record
                    var sPath = "/MyTimesheets('" + oEntry.id + "')";
                    oDataModel.update(sPath, oData, {
                        success: function (oResponse) {
                            console.log("✅ Successfully updated entry:", oResponse);
                            resolve(oResponse);
                        },
                        error: function (oError) {
                            console.error("❌ Error updating entry:", oError);
                            reject(oError);
                        }
                    });
                }
            });
        },

        _getCurrentWeekMonday: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            return oWeekDates.monday;
        },

        _calculateTotalHours: function (oEntry) {
            return (parseFloat(oEntry.monday) || 0) +
                (parseFloat(oEntry.tuesday) || 0) +
                (parseFloat(oEntry.wednesday) || 0) +
                (parseFloat(oEntry.thursday) || 0) +
                (parseFloat(oEntry.friday) || 0) +
                (parseFloat(oEntry.saturday) || 0) +
                (parseFloat(oEntry.sunday) || 0);
        },

        _capitalize: function (str) {
            if (!str) return "";
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        // Profile functionality
        onProfilePress: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var oViewModel = this.getView().getModel();

            if (!oDataModel) {
                MessageBox.error("OData model not found. Please check your manifest configuration.");
                return;
            }

            BusyIndicator.show(0);

            // First check if we already have profile data in the model
            // var oExistingProfile = oViewModel.getProperty("/profile");
            // if (oExistingProfile && oExistingProfile.employee_ID) {
            //     BusyIndicator.hide();
            //     this._openProfileDialog();
            //     return;
            // }

            // If not, load it from the backend
            oDataModel.read("/MyProfile", {
                success: function (oData) {
                    BusyIndicator.hide();

                    // Format profile data
                    var oProfile = {
                        // employee_ID: oData.employee_ID || oData.employee_ID || "",
                        firstName: oData.FirstName || oData.firstName || "",
                        lastName: oData.LastName || oData.lastName || "",
                        email: oData.Email || oData.email || "",
                        managerName: oData.ManagerName || oData.managerName || "",
                        managerEmail: oData.ManagerEmail || oData.managerEmail || "",
                        activeStatus: oData.ActiveStatus || oData.activeStatus || "",
                        changedBy: oData.ChangedBy || oData.changedBy || "",
                        userRole: oData.UserRole || oData.userRole || ""
                    };

                    oViewModel.setProperty("/profile", oProfile);

                    // Set employee name in the page header if available
                    var sEmployeeName = oProfile.firstName + " " + oProfile.lastName;
                    var oEmployeeNameText = this.getView().byId("employeeNameText");
                    if (oEmployeeNameText) {
                        oEmployeeNameText.setText(sEmployeeName);
                    }

                    this._openProfileDialog();
                }.bind(this),
                error: function (oError) {
                    BusyIndicator.hide();
                    MessageBox.error("Failed to load profile data. Please try again later.");
                    console.error("Error loading profile:", oError);
                }
            });
        },

        _openProfileDialog: function () {
            if (!this._oProfileDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.ProfileDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oProfileDialog = oDialog;
                    this.getView().addDependent(this._oProfileDialog);
                    this._oProfileDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading profile dialog. Please try again.");
                    console.error("Error loading fragment:", oError);
                });
            } else {
                this._oProfileDialog.open();
            }
        },

        onCloseProfileDialog: function () {
            if (this._oProfileDialog) {
                this._oProfileDialog.close();
            }
        },

        // Function to validate daily hours with backend
        _validateDailyHoursWithBackend: function (sDate) {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");

            if (!oDataModel) {
                return Promise.reject("OData model not available");
            }

            return new Promise(function (resolve, reject) {
                oDataModel.callFunction("/validateDailyHours", {
                    method: "GET",
                    urlParameters: {
                        "date": sDate
                    },
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            });
        }
    });
});




UPDATED CODE 

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/type/Float",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/m/Input",
    "sap/m/Button",
    "sap/ui/core/Item",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/m/DateRangeSelection",
    "sap/m/CheckBox",
    "sap/m/TextArea",
    "sap/m/SegmentedButton",
    "sap/m/SegmentedButtonItem",
    "sap/m/Popover",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/ObjectStatus",
    "sap/m/Text",
    "sap/m/ToolbarSpacer",
    "sap/m/OverflowToolbar",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem"
], function (Controller, MessageBox, MessageToast, JSONModel, FloatType, Dialog, VBox, Label,
    ComboBox, Input, Button, Item, History, Fragment, DateRangeSelection, CheckBox, TextArea,
    SegmentedButton, SegmentedButtonItem, Popover, List, StandardListItem, ObjectStatus,
    Text, ToolbarSpacer, OverflowToolbar, Table, Column, ColumnListItem) {
    "use strict";
    return Controller.extend("admin.com.admin.controller.Employee", {
        onInit: function () {
            this._initializeModel();
            this._initializeCurrentWeek();
            this._loadData(); // Renamed from ODataModel for clarity
            // Initialize router
            this._oRouter = this.getOwnerComponent().getRouter();
            if (!this._oRouter) {
                this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            }
        },

        // Formatter function to calculate row total
        formatRowTotal: function (monday, tuesday, wednesday, thursday, friday, saturday, sunday) {
            var total = (parseFloat(monday) || 0) +
                (parseFloat(tuesday) || 0) +
                (parseFloat(wednesday) || 0) +
                (parseFloat(thursday) || 0) +
                (parseFloat(friday) || 0) +
                (parseFloat(saturday) || 0) +
                (parseFloat(sunday) || 0);
            return total.toFixed(2);
        },

        // New function to format day with date
        formatDayWithDate: function (day, formattedDate) {
            return day + " (" + formattedDate + ")";
        },

        _initializeModel: function () {
            var oModel = new JSONModel({
                currentWeek: "",
                totalWeekHours: "0.00",
                isSubmitted: false,
                timeEntriesCount: "0",
                commentsCount: "0",
                selectedDate: null,
                isCurrentWeek: true,
                assignedProjects: [],
                nonProjectTypes: [],
                workTypes: [
                    { type: "DESIGN", name: "Designing" },
                    { type: "DEVELOP", name: "Developing" },
                    { type: "TEST", name: "Testing" },
                    { type: "DEPLOY", name: "Deployment" },
                    { type: "MEETING", name: "Meetings" },
                    { type: "DOCUMENTATION", name: "Documentation" },
                    { type: "LEAVE", name: "Leave" },
                    { type: "TRAINING", name: "Training" }
                ],
                timeEntries: [],
                dailyTotals: {
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0
                },
                dailyComments: [
                    { day: "Monday", comment: "", lastUpdated: "" },
                    { day: "Tuesday", comment: "", lastUpdated: "" },
                    { day: "Wednesday", comment: "", lastUpdated: "" },
                    { day: "Thursday", comment: "", lastUpdated: "" },
                    { day: "Friday", comment: "", lastUpdated: "" },
                    { day: "Saturday", comment: "", lastUpdated: "" },
                    { day: "Sunday", comment: "", lastUpdated: "" }
                ],
                projectEngagement: [],
                weekDates: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: "",
                    mondayFormatted: "",
                    tuesdayFormatted: "",
                    wednesdayFormatted: "",
                    thursdayFormatted: "",
                    fridayFormatted: "",
                    saturdayFormatted: "",
                    sundayFormatted: ""
                },
                editEntry: {},
                newEntry: {
                    selectedDate: "",
                    projectId: "",
                    workType: "",
                    hours: "8",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                },
                newDailyComment: {
                    day: "",
                    comment: ""
                },
                employeeProjectHours: [],
                employeeProjectDurations: [],
                // COMMENT DIALOG DATA
                currentCommentType: "daily",
                selectedDay: "Monday",
                dailyCommentText: "",
                weeklyCommentText: "",
                monthlyCommentText: "",
                currentMonth: "",
                projects: [],
                selectedProject: "",
                dueDateStart: null,
                dueDateEnd: null,
                selectedWorkType: "DESIGN",
                statusOptions: [
                    { key: "todo", text: "To Do" },
                    { key: "inprogress", text: "In Progress" },
                    { key: "done", text: "Done" },
                    { key: "review", text: "Under Review" }
                ],
                selectedStatus: "todo",
                priorityOptions: [
                    { key: "low", text: "Low" },
                    { key: "medium", text: "Medium" },
                    { key: "high", text: "High" },
                    { key: "urgent", text: "Urgent" }
                ],
                selectedPriority: "medium",
                needInput: false,
                newCommentText: "",
                existingComments: [],
                editCommentText: "",
                editCommentId: ""
            });
            this.getView().setModel(oModel);
        },

        _loadData: function () {
            // Get the OData V2 model from manifest
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            
            if (!oDataModel) {
                MessageBox.error("OData model not found. Please check your manifest configuration.");
                return;
            }

            var that = this;
            var oViewModel = this.getView().getModel();

            // Use Promise.all to handle all three requests
            Promise.all([
                this._readODataEntity(oDataModel, "/MyProgressSummary"),
                this._readODataEntity(oDataModel, "/MyTimesheets"),
                this._readODataEntity(oDataModel, "/AvailableNonProjectTypes")
            ]).then(function(aResults) {
                // Process projects data
                var aProjects = aResults[0].results || [];
                var aFormattedProjects = aProjects.map(function (project) {
                    return {
                        projectId: project.projectId || project.ID || project.Project_ID,
                        projectName: project.projectName || project.Name || project.Project_Name,
                        managerName: project.managerName || project.Manager || project.Manager_Name,
                        status: project.status || project.Status,
                        startDate: project.startDate || project.Start_Date,
                        endDate: project.endDate || project.End_Date,
                        allocatedHours: project.allocatedHours || project.Allocated_Hours || 0
                    };
                });

                oViewModel.setProperty("/assignedProjects", aFormattedProjects);
                oViewModel.setProperty("/projects", aFormattedProjects.map(function (p) {
                    return { id: p.projectId, name: p.projectName };
                }));

                if (aFormattedProjects.length > 0) {
                    oViewModel.setProperty("/selectedProject", aFormattedProjects[0].projectId);
                }

                // Process non-project types data
                var aNonProjectTypes = aResults[2].results || [];
                var aFormattedNonProjectTypes = aNonProjectTypes.map(function (type) {
                    return {
                        typeId: type.typeId || type.ID,
                        typeName: type.typeName || type.Name,
                        description: type.description || type.Description
                    };
                });
                oViewModel.setProperty("/nonProjectTypes", aFormattedNonProjectTypes);

                // Process timesheets data
                var aTimesheets = aResults[1].results || [];
                var aFormattedTimesheets = aTimesheets.map(function (timesheet) {
                    var oDayHours = {
                        monday: parseFloat(timesheet.monday || timesheet.Monday || 0),
                        tuesday: parseFloat(timesheet.tuesday || timesheet.Tuesday || 0),
                        wednesday: parseFloat(timesheet.wednesday || timesheet.Wednesday || 0),
                        thursday: parseFloat(timesheet.thursday || timesheet.Thursday || 0),
                        friday: parseFloat(timesheet.friday || timesheet.Friday || 0),
                        saturday: parseFloat(timesheet.saturday || timesheet.Saturday || 0),
                        sunday: parseFloat(timesheet.sunday || timesheet.Sunday || 0)
                    };

                    return {
                        id: timesheet.id || timesheet.ID,
                        projectId: timesheet.projectId || timesheet.Project_ID || timesheet.project_ID,
                        projectName: timesheet.projectName || timesheet.Project_Name,
                        workTypeName: timesheet.activity || timesheet.Activity || timesheet.Task,
                        workType: that._mapActivityToWorkType(timesheet.activity || timesheet.Activity || timesheet.Task),
                        comment: timesheet.taskDetails || timesheet.Task_Details || timesheet.Description || "",
                        isApproved: (timesheet.status === "Approved") || (timesheet.Status === "Approved") || false,
                        isFutureDay: false,
                        dailyComments: {
                            monday: timesheet.mondayComment || timesheet.Monday_Comment || "",
                            tuesday: timesheet.tuesdayComment || timesheet.Tuesday_Comment || "",
                            wednesday: timesheet.wednesdayComment || timesheet.Wednesday_Comment || "",
                            thursday: timesheet.thursdayComment || timesheet.Thursday_Comment || "",
                            friday: timesheet.fridayComment || timesheet.Friday_Comment || "",
                            saturday: timesheet.saturdayComment || timesheet.Saturday_Comment || "",
                            sunday: timesheet.sundayComment || timesheet.Sunday_Comment || ""
                        },
                        ...oDayHours // Merge hours into each record
                    };
                });

                oViewModel.setProperty("/timeEntries", aFormattedTimesheets);

                // Update helper functions
                that._calculateAllTotals();
                that._updateCounts();
                that._updateProjectEngagement();
                that._updateReportsData();
                
                // Force model update
                oViewModel.refresh(true);
            }).catch(function(oError) {
                MessageBox.error("Failed to load data. Please try again later.");
                console.error("Error loading data:", oError);
            });
        },

        _readODataEntity: function(oModel, sPath) {
            return new Promise(function(resolve, reject) {
                oModel.read(sPath, {
                    success: function(oData) {
                        resolve(oData);
                    },
                    error: function(oError) {
                        reject(oError);
                    }
                });
            });
        },

        _mapActivityToWorkType: function (activity) {
            // Map activity names to work type codes
            var activityMap = {
                "Designing": "DESIGN",
                "Developing": "DEVELOP",
                "Testing": "TEST",
                "Deployment": "DEPLOY",
                "Meetings": "MEETING",
                "Documentation": "DOCUMENTATION",
                "Leave": "LEAVE",
                "Training": "TRAINING"
            };

            return activityMap[activity] || "DEVELOP"; // Default to DEVELOP if not found
        },

        _initializeCurrentWeek: function () {
            var today = new Date();
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            oModel.setProperty("/isCurrentWeek", true);
            this._updateWeekDates(today);

            // Set current month
            var months = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            oModel.setProperty("/currentMonth", months[today.getMonth()] + " " + today.getFullYear());
        },

        _updateWeekDates: function (oDate) {
            var oModel = this.getView().getModel();
            var startDate = new Date(oDate);
            var day = startDate.getDay();
            var diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            var monday = new Date(startDate.setDate(diff));
            var tuesday = new Date(monday);
            tuesday.setDate(monday.getDate() + 1);
            var wednesday = new Date(monday);
            wednesday.setDate(monday.getDate() + 2);
            var thursday = new Date(monday);
            thursday.setDate(monday.getDate() + 3);
            var friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            var saturday = new Date(monday);
            saturday.setDate(monday.getDate() + 5);
            var sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            var oWeekDates = {
                monday: this._formatDateForModel(monday),
                tuesday: this._formatDateForModel(tuesday),
                wednesday: this._formatDateForModel(wednesday),
                thursday: this._formatDateForModel(thursday),
                friday: this._formatDateForModel(friday),
                saturday: this._formatDateForModel(saturday),
                sunday: this._formatDateForModel(sunday),
                mondayFormatted: this._formatDateDisplay(monday),
                tuesdayFormatted: this._formatDateDisplay(tuesday),
                wednesdayFormatted: this._formatDateDisplay(wednesday),
                thursdayFormatted: this._formatDateDisplay(thursday),
                fridayFormatted: this._formatDateDisplay(friday),
                saturdayFormatted: this._formatDateDisplay(saturday),
                sundayFormatted: this._formatDateDisplay(sunday)
            };
            var sCurrentWeek = this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday) + " " + sunday.getFullYear();
            oModel.setProperty("/weekDates", oWeekDates);
            oModel.setProperty("/currentWeek", sCurrentWeek);

            // Check if this is the current week
            var today = new Date();
            var isCurrentWeek = today >= monday && today <= sunday;
            oModel.setProperty("/isCurrentWeek", isCurrentWeek);

            Object.keys(oWeekDates).forEach(function (sDay) {
                if (sDay.endsWith("Formatted")) return;
                var dayDate = new Date(oWeekDates[sDay]);
                var isFuture = dayDate > today;
                oWeekDates[sDay + "IsFuture"] = isFuture;
            });
            oModel.setProperty("/weekDates", oWeekDates);
        },

        _formatDateForModel: function (oDate) {
            return oDate.getFullYear() + "-" +
                ("0" + (oDate.getMonth() + 1)).slice(-2) + "-" +
                ("0" + oDate.getDate()).slice(-2);
        },

        _formatDateDisplay: function (oDate) {
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[oDate.getMonth()] + " " + ("0" + oDate.getDate()).slice(-2);
        },

        _updateCounts: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aComments = oModel.getProperty("/dailyComments");
            var iCommentsWithText = aComments.filter(function (comment) {
                return comment.comment && comment.comment.trim() !== "";
            }).length;
            oModel.setProperty("/timeEntriesCount", aEntries.length.toString());
            oModel.setProperty("/commentsCount", iCommentsWithText.toString());
        },

        // New function to handle task detail button press
        onTaskDetailPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();

            // Get week dates from model
            var oWeekDates = oModel.getProperty("/weekDates");

            // Create array of days with hours worked
            var aDays = [
                { day: "Monday", date: oWeekDates.mondayFormatted, hours: oEntry.monday, comment: oEntry.dailyComments.monday },
                { day: "Tuesday", date: oWeekDates.tuesdayFormatted, hours: oEntry.tuesday, comment: oEntry.dailyComments.tuesday },
                { day: "Wednesday", date: oWeekDates.wednesdayFormatted, hours: oEntry.wednesday, comment: oEntry.dailyComments.wednesday },
                { day: "Thursday", date: oWeekDates.thursdayFormatted, hours: oEntry.thursday, comment: oEntry.dailyComments.thursday },
                { day: "Friday", date: oWeekDates.fridayFormatted, hours: oEntry.friday, comment: oEntry.dailyComments.friday },
                { day: "Saturday", date: oWeekDates.saturdayFormatted, hours: oEntry.saturday, comment: oEntry.dailyComments.saturday },
                { day: "Sunday", date: oWeekDates.sundayFormatted, hours: oEntry.sunday, comment: oEntry.dailyComments.sunday }
            ];

            // Filter days with hours > 0
            var aDaysWithHours = aDays.filter(function (oDay) {
                return parseFloat(oDay.hours) > 0;
            });

            // Create popover content
            var oPopover = new Popover({
                placement: sap.m.PlacementType.Auto,
                title: "Task Details",
                content: new VBox({
                    items: [
                        new Text({
                            text: oEntry.comment || "No task details provided"
                        }).addStyleClass("sapUiTinyMargin"),
                        new List({
                            headerText: "Hours Worked",
                            items: aDaysWithHours.map(function (oDay) {
                                return new StandardListItem({
                                    title: oDay.day + " (" + oDay.date + ")",
                                    info: oDay.hours + " hours",
                                    description: oDay.comment || "",
                                    infoState: parseFloat(oDay.hours) >= 8 ? "Success" : "Warning"
                                });
                            })
                        })
                    ]
                }),
                footer: new OverflowToolbar({
                    content: [
                        new ToolbarSpacer(),
                        new Button({
                            text: "Close",
                            type: "Emphasized",
                            press: function () {
                                oPopover.close();
                            }
                        })
                    ]
                })
            });

            // Open popover
            oPopover.openBy(oButton);
        },

        // COMMENT DIALOG FUNCTIONS
        onInfoPress: function () {
            if (!this._oCommentOptionsDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.CommentOptions",
                    controller: this
                }).then(function (oDialog) {
                    this._oCommentOptionsDialog = oDialog;
                    this.getView().addDependent(this._oCommentOptionsDialog);
                    // Initialize comment data
                    this._initializeCommentData();
                    this._oCommentOptionsDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Error loading comment dialog. Please try again.");
                });
            } else {
                this._initializeCommentData();
                this._oCommentOptionsDialog.open();
            }
        },

        _initializeCommentData: function () {
            var oModel = this.getView().getModel();
            // Reset form data
            oModel.setProperty("/currentCommentType", "daily");
            oModel.setProperty("/selectedDay", "Monday");
            oModel.setProperty("/dailyCommentText", "");
            oModel.setProperty("/weeklyCommentText", "");
            oModel.setProperty("/monthlyCommentText", "");
            oModel.setProperty("/newCommentText", "");
            oModel.setProperty("/needInput", false);
            // Set default values for dropdowns - use first item from each list
            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            if (aProjects && aProjects.length > 0) {
                oModel.setProperty("/selectedProject", aProjects[0].id);
            }
            if (aWorkTypes && aWorkTypes.length > 0) {
                oModel.setProperty("/selectedWorkType", aWorkTypes[0].type);
            }
            oModel.setProperty("/selectedStatus", "todo");
            oModel.setProperty("/selectedPriority", "medium");
            // Set current date for due date
            var today = new Date();
            var todayStr = today.getFullYear() + "-" +
                ("0" + (today.getMonth() + 1)).slice(-2) + "-" +
                ("0" + today.getDate()).slice(-2);
            oModel.setProperty("/dueDateStart", todayStr);
            oModel.setProperty("/dueDateEnd", todayStr);
        },

        onCommentTypeSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oModel = this.getView().getModel();
            oModel.setProperty("/currentCommentType", sKey);
            MessageToast.show("Switched to " + sKey + " comments");
        },

        onAddNewComment: function () {
            var oModel = this.getView().getModel();
            var sNewComment = oModel.getProperty("/newCommentText");
            if (!sNewComment || sNewComment.trim() === "") {
                MessageBox.error("Please enter a comment");
                return;
            }
            // Add new comment to existing comments
            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Just Now",
                text: sNewComment
            });
            oModel.setProperty("/existingComments", aExistingComments);
            oModel.setProperty("/newCommentText", "");
            MessageToast.show("Comment added successfully");
        },

        onSaveCommentOption: function () {
            var oModel = this.getView().getModel();
            var sCommentType = oModel.getProperty("/currentCommentType");
            if (sCommentType === "daily") {
                this._saveDailyComment();
            } else if (sCommentType === "weekly") {
                this._saveWeeklyComment();
            } else if (sCommentType === "monthly") {
                this._saveMonthlyComment();
            }
        },

        _saveCommentToTimesheet: function (sComment, sType, sProjectName, sWorkTypeName) {
            var oModel = this.getView().getModel();
            var aTimeEntries = oModel.getProperty("/timeEntries");
            // Create a new time entry for the comment
            var oCommentEntry = {
                id: "c" + Date.now(),
                projectId: "comment",
                projectName: sProjectName || "Comment",
                workTypeName: sWorkTypeName || (sType + " Comment"),
                workType: "COMMENT",
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: sComment,
                isApproved: true,
                isFutureDay: false,
                isCommentEntry: true,
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };
            // Add the comment entry to the time entries
            aTimeEntries.push(oCommentEntry);
            oModel.setProperty("/timeEntries", aTimeEntries);
            // Refresh the table
            var oTable = this.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
            MessageToast.show(sType + " comment saved to timesheet");
        },

        _saveDailyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/dailyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");
            var sStatus = oModel.getProperty("/selectedStatus");
            var sPriority = oModel.getProperty("/selectedPriority");
            var bNeedInput = oModel.getProperty("/needInput");
            var sSelectedDay = oModel.getProperty("/selectedDay");
            // Validation
            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a description for the daily comment");
                return;
            }
            if (!sProject) {
                MessageBox.error("Please select a project");
                return;
            }
            if (!sWorkType) {
                MessageBox.error("Please select a work type");
                return;
            }
            // Get display values
            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var aStatusOptions = oModel.getProperty("/statusOptions");
            var aPriorityOptions = oModel.getProperty("/priorityOptions");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });
            var oSelectedStatus = aStatusOptions.find(function (item) { return item.key === sStatus; });
            var oSelectedPriority = aPriorityOptions.find(function (item) { return item.key === sPriority; });
            // Prepare comment data
            var oCommentData = {
                type: "daily",
                day: sSelectedDay,
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                status: oSelectedStatus ? oSelectedStatus.text : "Unknown",
                priority: oSelectedPriority ? oSelectedPriority.text : "Unknown",
                dueDateStart: oModel.getProperty("/dueDateStart"),
                dueDateEnd: oModel.getProperty("/dueDateEnd"),
                description: sComment,
                needInput: bNeedInput,
                timestamp: new Date().toISOString()
            };
            // Log for debugging
            console.log("Saving daily comment:", oCommentData);
            // Format comment for display with both project and work type
            var sFormattedComment = "[" + sSelectedDay + "] " + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown") +
                "\nStatus: " + (oSelectedStatus ? oSelectedStatus.text : "Unknown") +
                "\nPriority: " + (oSelectedPriority ? oSelectedPriority.text : "Unknown");
            // Update daily comments in the model
            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedDay;
            });
            var now = new Date();
            var timeStr = now.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            if (oDayComment) {
                oDayComment.comment = sComment;
                oDayComment.lastUpdated = timeStr;
            } else {
                aDailyComments.push({
                    day: sSelectedDay,
                    comment: sComment,
                    lastUpdated: timeStr
                });
            }
            oModel.setProperty("/dailyComments", aDailyComments);
            this._updateCounts();
            // Save comment to timesheet with project and work type
            this._saveCommentToTimesheet(
                sFormattedComment,
                "Daily",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );
            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveWeeklyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/weeklyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");
            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a weekly summary");
                return;
            }
            // Get display values
            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });
            var oCommentData = {
                type: "weekly",
                week: oModel.getProperty("/currentWeek"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                summary: sComment,
                timestamp: new Date().toISOString()
            };
            // Log for debugging
            console.log("Saving weekly comment:", oCommentData);
            // Format comment for display with both project and work type
            var sFormattedComment = "[Weekly Summary - " + oModel.getProperty("/currentWeek") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");
            // Add to existing comments as a special entry
            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Weekly Summary - " + new Date().toLocaleDateString(),
                text: "[WEEKLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);
            // Save comment to timesheet with project and work type
            this._saveCommentToTimesheet(
                sFormattedComment,
                "Weekly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );
            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        _saveMonthlyComment: function () {
            var oModel = this.getView().getModel();
            var sComment = oModel.getProperty("/monthlyCommentText");
            var sProject = oModel.getProperty("/selectedProject");
            var sWorkType = oModel.getProperty("/selectedWorkType");
            if (!sComment || sComment.trim() === "") {
                MessageBox.error("Please enter a monthly review");
                return;
            }
            // Get display values
            var aProjects = oModel.getProperty("/projects");
            var aWorkTypes = oModel.getProperty("/workTypes");
            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });
            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });
            var oCommentData = {
                type: "monthly",
                month: oModel.getProperty("/currentMonth"),
                project: oSelectedProject ? oSelectedProject.name : "Unknown",
                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",
                review: sComment,
                timestamp: new Date().toISOString()
            };
            // Log for debugging
            console.log("Saving monthly comment:", oCommentData);
            // Format comment for display with both project and work type
            var sFormattedComment = "[Monthly Review - " + oModel.getProperty("/currentMonth") + "]\n" + sComment +
                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +
                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");
            // Add to existing comments as a special entry
            var aExistingComments = oModel.getProperty("/existingComments") || [];
            aExistingComments.push({
                author: "You",
                date: "Monthly Review - " + new Date().toLocaleDateString(),
                text: "[MONTHLY] " + sComment
            });
            oModel.setProperty("/existingComments", aExistingComments);
            // Save comment to timesheet with project and work type
            this._saveCommentToTimesheet(
                sFormattedComment,
                "Monthly",
                oSelectedProject ? oSelectedProject.name : "Unknown",
                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"
            );
            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        onCancelCommentOption: function () {
            if (this._oCommentOptionsDialog) {
                this._oCommentOptionsDialog.close();
            }
        },

        // Day selection for daily comments
        onDaySelect: function (oEvent) {
            var oModel = this.getView().getModel();
            var sSelectedKey = oEvent.getParameter("selectedKey");
            oModel.setProperty("/selectedDay", sSelectedKey);
            // Load existing comment for selected day if any
            var aDailyComments = oModel.getProperty("/dailyComments") || [];
            var oDayComment = aDailyComments.find(function (comment) {
                return comment.day === sSelectedKey;
            });
            if (oDayComment && oDayComment.comment) {
                oModel.setProperty("/dailyCommentText", oDayComment.comment);
            } else {
                oModel.setProperty("/dailyCommentText", "");
            }
        },

        // Comment management functions
        onEditComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();
            // Set the comment text in the model for editing
            oModel.setProperty("/editCommentText", oEntry.comment);
            oModel.setProperty("/editCommentId", oEntry.id);
            if (!this._oEditCommentDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditComment",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditCommentDialog = oDialog;
                    this.getView().addDependent(this._oEditCommentDialog);
                    this._oEditCommentDialog.open();
                }.bind(this));
            } else {
                this._oEditCommentDialog.open();
            }
        },

        onSaveEditedComment: function () {
            var oModel = this.getView().getModel();
            var sCommentText = oModel.getProperty("/editCommentText");
            var sCommentId = oModel.getProperty("/editCommentId");
            if (!sCommentText || sCommentText.trim() === "") {
                MessageBox.error("Comment cannot be empty");
                return;
            }
            var aTimeEntries = oModel.getProperty("/timeEntries");
            var oCommentEntry = aTimeEntries.find(function (entry) {
                return entry.id === sCommentId;
            });
            if (oCommentEntry) {
                oCommentEntry.comment = sCommentText;
                oModel.setProperty("/timeEntries", aTimeEntries);
                // Refresh the table
                var oTable = this.getView().byId("timesheetTable");
                if (oTable && oTable.getBinding("items")) {
                    oTable.getBinding("items").refresh();
                }
                MessageToast.show("Comment updated successfully");
            }
            if (this._oEditCommentDialog) {
                this._oEditCommentDialog.close();
            }
        },

        onCancelEditComment: function () {
            if (this._oEditCommentDialog) {
                this._oEditCommentDialog.close();
            }
        },

        onDeleteComment: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            MessageBox.confirm("Are you sure you want to delete this comment?", {
                title: "Delete Comment",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = this.getView().getModel();
                        var aTimeEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aTimeEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            aTimeEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aTimeEntries);
                            // Refresh the table
                            var oTable = this.getView().byId("timesheetTable");
                            if (oTable && oTable.getBinding("items")) {
                                oTable.getBinding("items").refresh();
                            }
                            MessageToast.show("Comment deleted successfully");
                        }
                    }
                }.bind(this)
            });
        },

        onCommentLiveChange: function (oEvent) {
            // This function can be used for live validation if needed
        },

        // EXISTING FUNCTIONS
        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            MessageToast.show("Switched to " + sKey + " tab");
            // If switching to reports tab, update the reports data
            if (sKey === "reports") {
                this._updateReportsData();
            }
        },

        onAddEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = {
                selectedDate: this._formatDateForModel(new Date()),
                projectId: "",
                workType: "",
                hours: "8",
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: "",
                taskDetails: "",
                dailyComments: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: ""
                }
            };
            oModel.setProperty("/newEntry", oNewEntry);
            if (!this._oAddEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.AddTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oAddEntryDialog = oDialog;
                    this.getView().addDependent(this._oAddEntryDialog);
                    this._oAddEntryDialog.open();
                }.bind(this));
            } else {
                this._oAddEntryDialog.open();
            }
        },

        onEntryDatePickerChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sDate = oDatePicker.getValue();
            if (sDate) {
                var selectedDate = new Date(sDate);
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry/selectedDate", this._formatDateForModel(selectedDate));
                // Check if the selected date is within the current week
                var oWeekDates = oModel.getProperty("/weekDates");
                var monday = new Date(oWeekDates.monday);
                var sunday = new Date(oWeekDates.sunday);
                if (selectedDate < monday || selectedDate > sunday) {
                    MessageBox.warning("The selected date is outside the current week. Please select a date within " +
                        this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday));
                }
            }
        },

        onFragmentHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            // Validate that the input is a number between 0 and 24
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            // Recalculate totals
            this._calculateAllTotals();
        },

        onTaskDetailsLiveChange: function (oEvent) {
            var oTextArea = oEvent.getSource();
            var sValue = oTextArea.getValue();
            var oModel = this.getView().getModel();

            // Update the task details in the model
            oModel.setProperty("/newEntry/taskDetails", sValue);

            // Optionally provide visual feedback when approaching the limit
            if (sValue.length >= 45) {
                oTextArea.addStyleClass("sapUiFieldWarning");
            } else {
                oTextArea.removeStyleClass("sapUiFieldWarning");
            }
        },

        _saveTimeEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = oModel.getProperty("/newEntry");

            // Validation
            if (!oNewEntry.projectId || oNewEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return false;
            }
            if (!oNewEntry.workType || oNewEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return false;
            }
            if (!oNewEntry.hours || oNewEntry.hours.trim() === "") {
                MessageBox.error("Please select hours");
                return false;
            }

            // Get the selected date and determine the day of the week
            var selectedDate = new Date(oNewEntry.selectedDate);
            var dayOfWeek = selectedDate.getDay();

            // Map dayOfWeek to our property names
            var dayMap = {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday"
            };
            var dayProperty = dayMap[dayOfWeek];

            // Get the hours for the selected day
            var hoursForDay = parseFloat(oNewEntry.hours) || 0;

            if (hoursForDay === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return false;
            }

            // Get existing entries
            var aEntries = oModel.getProperty("/timeEntries");

            // Check if there's already an entry with the same project and work type
            var existingEntryIndex = aEntries.findIndex(function (entry) {
                return entry.projectId === oNewEntry.projectId && entry.workType === oNewEntry.workType;
            });

            if (existingEntryIndex !== -1) {
                // Update existing entry
                var existingEntry = aEntries[existingEntryIndex];

                // If the entry is approved, notify the manager
                if (existingEntry.isApproved) {
                    this._notifyManagerOfChange(existingEntry, "Time entry modified");
                }

                // Update the hours for the selected day
                existingEntry[dayProperty] = hoursForDay;

                // Update the comment/task details
                existingEntry.comment = oNewEntry.taskDetails || "";

                // Update daily comments
                if (oNewEntry.dailyComments && oNewEntry.dailyComments[dayProperty]) {
                    existingEntry.dailyComments[dayProperty] = oNewEntry.dailyComments[dayProperty];
                }

                // Update the model
                oModel.setProperty("/timeEntries", aEntries);
            } else {
                // Create a new entry
                var sNewId = "d47ac10b-58cc-4372-a567-0e02b2c3d" + (500 + aEntries.length);
                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oNewEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oNewEntry.workType;
                });

                // Create a new entry object with all days set to 0
                var oTimeEntry = {
                    id: sNewId,
                    projectId: oNewEntry.projectId,
                    projectName: oProject ? oProject.projectName : "",
                    workType: oNewEntry.workType,
                    workTypeName: oWorkType ? oWorkType.name : "",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: oNewEntry.taskDetails || "",
                    isApproved: false,
                    isFutureDay: false,
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                };

                // Set the hours for the selected day
                oTimeEntry[dayProperty] = hoursForDay;

                // Set daily comment if available
                if (oNewEntry.dailyComments && oNewEntry.dailyComments[dayProperty]) {
                    oTimeEntry.dailyComments[dayProperty] = oNewEntry.dailyComments[dayProperty];
                }

                // Add the new entry to the array
                aEntries.push(oTimeEntry);
                oModel.setProperty("/timeEntries", aEntries);
            }

            // Update totals and refresh the table
            this._calculateAllTotals();
            this._updateCounts();
            this._updateProjectEngagement();
            this._updateReportsData();

            var oTable = this.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }

            MessageToast.show(existingEntryIndex !== -1 ? "Time entry updated successfully" : "Time entry added successfully");
            return true;
        },

        onSaveNewEntry: function () {
            if (this._saveTimeEntry()) {
                this._oAddEntryDialog.close();
            }
        },

        onSaveAndNewEntry: function () {
            if (this._saveTimeEntry()) {
                // Reset the form
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry", {
                    selectedDate: this._formatDateForModel(new Date()),
                    projectId: "",
                    workType: "",
                    hours: "8",
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: "",
                    taskDetails: "",
                    dailyComments: {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: ""
                    }
                });
                // Keep the dialog open for new entry
                MessageToast.show("Time entry saved. Ready for new entry.");
            }
        },

        onCancelNewEntry: function () {
            this._oAddEntryDialog.close();
        },

        onEditEntry: function (oEvent) {
            var oButton = oEvent.getSource();
            var oBindingContext = oButton.getBindingContext();
            if (!oBindingContext) return;
            var oEntry = oBindingContext.getObject();
            var oModel = this.getView().getModel();
            oModel.setProperty("/editEntry", JSON.parse(JSON.stringify(oEntry)));
            if (!this._oEditEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.EditTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditEntryDialog = oDialog;
                    this.getView().addDependent(this._oEditEntryDialog);
                    this._oEditEntryDialog.open();
                }.bind(this));
            } else {
                this._oEditEntryDialog.open();
            }
        },

        onCancelEditEntry: function () {
            if (this._oEditEntryDialog) {
                this._oEditEntryDialog.close();
            }
        },

        onSaveEditedEntry: function () {
            var oModel = this.getView().getModel();
            var oEditEntry = oModel.getProperty("/editEntry");
            var aEntries = oModel.getProperty("/timeEntries");
            if (!oEditEntry.projectId || oEditEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return;
            }
            if (!oEditEntry.workType || oEditEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return;
            }
            var totalHours = parseFloat(oEditEntry.monday || 0) +
                parseFloat(oEditEntry.tuesday || 0) +
                parseFloat(oEditEntry.wednesday || 0) +
                parseFloat(oEditEntry.thursday || 0) +
                parseFloat(oEditEntry.friday || 0) +
                parseFloat(oEditEntry.saturday || 0) +
                parseFloat(oEditEntry.sunday || 0);
            if (totalHours === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return;
            }
            var iIndex = aEntries.findIndex(function (entry) {
                return entry.id === oEditEntry.id;
            });
            if (iIndex > -1) {
                if (aEntries[iIndex].isApproved) {
                    this._notifyManagerOfChange(aEntries[iIndex], "Time entry modified");
                }
                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                    return p.projectId === oEditEntry.projectId;
                });
                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                    return w.type === oEditEntry.workType;
                });
                oEditEntry.projectName = oProject ? oProject.projectName : "";
                oEditEntry.workTypeName = oWorkType ? oWorkType.name : "";
                Object.keys(oEditEntry).forEach(function (key) {
                    aEntries[iIndex][key] = oEditEntry[key];
                });
                oModel.setProperty("/timeEntries", aEntries);
                this._calculateAllTotals();
                this._updateProjectEngagement();
                this._updateReportsData();
                var oTable = this.getView().byId("timesheetTable");
                if (oTable && oTable.getBinding("items")) {
                    oTable.getBinding("items").refresh();
                }
                this._oEditEntryDialog.close();
                MessageToast.show("Time entry updated successfully");
            }
        },

        onDeleteEntry: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext();
            if (!oContext) return;
            var oEntry = oContext.getObject();
            if (oEntry.isApproved) {
                MessageBox.warning("Cannot delete approved entry. Please contact your manager.");
                return;
            }
            MessageBox.confirm("Are you sure you want to delete this time entry?", {
                title: "Delete Entry",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        var oModel = this.getView().getModel();
                        var aEntries = oModel.getProperty("/timeEntries");
                        var iIndex = aEntries.findIndex(function (entry) {
                            return entry.id === oEntry.id;
                        });
                        if (iIndex > -1) {
                            aEntries.splice(iIndex, 1);
                            oModel.setProperty("/timeEntries", aEntries);
                            this._calculateAllTotals();
                            this._updateCounts();
                            this._updateProjectEngagement();
                            this._updateReportsData();
                            var oTable = this.getView().byId("timesheetTable");
                            if (oTable && oTable.getBinding("items")) {
                                oTable.getBinding("items").refresh();
                            }
                            MessageToast.show("Time entry deleted");
                        }
                    }
                }.bind(this)
            });
        },

        onHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }
            this._calculateAllTotals();
            this._validateDailyHours();
        },

        _calculateAllTotals: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var oTotals = {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0
            };
            aEntries.forEach(function (oEntry) {
                oTotals.monday += parseFloat(oEntry.monday) || 0;
                oTotals.tuesday += parseFloat(oEntry.tuesday) || 0;
                oTotals.wednesday += parseFloat(oEntry.wednesday) || 0;
                oTotals.thursday += parseFloat(oEntry.thursday) || 0;
                oTotals.friday += parseFloat(oEntry.friday) || 0;
                oTotals.saturday += parseFloat(oEntry.saturday) || 0;
                oTotals.sunday += parseFloat(oEntry.sunday) || 0;
            });
            var fWeekTotal = Object.values(oTotals).reduce(function (sum, hours) {
                return sum + hours;
            }, 0);
            oModel.setProperty("/dailyTotals", oTotals);
            oModel.setProperty("/totalWeekHours", fWeekTotal.toFixed(2));
            this._updateProjectEngagement();
        },

        _updateProjectEngagement: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var aEngagement = [];
            aProjects.forEach(function (oProject) {
                var aProjectEntries = aEntries.filter(function (oEntry) {
                    return oEntry.projectId === oProject.projectId;
                });
                var fTotalHours = aProjectEntries.reduce(function (total, oEntry) {
                    return total + (parseFloat(oEntry.monday) || 0) +
                        (parseFloat(oEntry.tuesday) || 0) +
                        (parseFloat(oEntry.wednesday) || 0) +
                        (parseFloat(oEntry.thursday) || 0) +
                        (parseFloat(oEntry.friday) || 0) +
                        (parseFloat(oEntry.saturday) || 0) +
                        (parseFloat(oEntry.sunday) || 0);
                }, 0);
                aEngagement.push({
                    projectName: oProject.projectName,
                    managerName: oProject.managerName,
                    totalHours: fTotalHours.toFixed(2),
                    engagementDuration: this._calculateEngagementDuration(oProject.startDate, oProject.endDate),
                    status: oProject.status
                });
            }.bind(this));
            oModel.setProperty("/projectEngagement", aEngagement);
        },

        _updateReportsData: function () {
            var oModel = this.getView().getModel();
            var aEntries = oModel.getProperty("/timeEntries");
            var aProjects = oModel.getProperty("/assignedProjects");
            var today = new Date();
            // Booked Hours Overview
            var aEmployeeProjectHours = aProjects.map(function (project) {
                var aProjectEntries = aEntries.filter(function (entry) {
                    return entry.projectId === project.projectId;
                });
                var bookedHours = aProjectEntries.reduce(function (total, entry) {
                    return total + (parseFloat(entry.monday) || 0) +
                        (parseFloat(entry.tuesday) || 0) +
                        (parseFloat(entry.wednesday) || 0) +
                        (parseFloat(entry.thursday) || 0) +
                        (parseFloat(entry.friday) || 0) +
                        (parseFloat(entry.saturday) || 0) +
                        (parseFloat(entry.sunday) || 0);
                }, 0);
                var utilization = project.allocatedHours > 0 ? Math.round((bookedHours / project.allocatedHours) * 100) : 0;
                return {
                    projectName: project.projectName,
                    allocatedHours: project.allocatedHours,
                    bookedHours: bookedHours,
                    remainingHours: project.allocatedHours - bookedHours,
                    utilization: utilization
                };
            });
            oModel.setProperty("/employeeProjectHours", aEmployeeProjectHours);
            // Project Engagement Duration
            var aEmployeeProjectDurations = aProjects.map(function (project) {
                var startDate = new Date(project.startDate);
                var endDate = new Date(project.endDate);
                var durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                var daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                var timelineStatus = project.status === "Completed" ? "Completed" :
                    project.status === "On Hold" ? "On Hold" :
                        daysRemaining < 0 ? "Delayed" :
                            daysRemaining < 14 ? "At Risk" : "On Track";
                return {
                    projectName: project.projectName,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    durationDays: durationDays,
                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                    timelineStatus: timelineStatus
                };
            });
            oModel.setProperty("/employeeProjectDurations", aEmployeeProjectDurations);
        },

        _calculateEngagementDuration: function (sStartDate, sEndDate) {
            var oStart = new Date(sStartDate);
            var oEnd = new Date(sEndDate);
            var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 +
                (oEnd.getMonth() - oStart.getMonth());
            if (iMonths === 0) {
                var iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24));
                return iDays + " days";
            } else if (iMonths < 12) {
                return iMonths + " months";
            } else {
                var iYears = Math.floor(iMonths / 12);
                var iRemainingMonths = iMonths % 12;
                return iYears + " year" + (iYears > 1 ? "s" : "") +
                    (iRemainingMonths > 0 ? " " + iRemainingMonths + " months" : "");
            }
        },

        _validateDailyHours: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var today = new Date();
            var aWarnings = [];
            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];
                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required)");
                }
            });
            if (aWarnings.length > 0) {
                console.warn("Hours validation warnings:", aWarnings);
            }
        },

        onProjectSelect: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (oSelectedItem) {
                var oProject = oSelectedItem.getBindingContext().getObject();
                MessageToast.show("Selected project: " + oProject.projectName + " (Manager: " + oProject.managerName + ")");
            }
        },

        onProjectChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Project changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        onWorkTypeChange: function (oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedKey");
            var oEntry = oEvent.getSource().getBindingContext().getObject();
            if (oEntry.isApproved) {
                this._notifyManagerOfChange(oEntry, "Work type changed to: " + sSelectedKey);
            }
            this._calculateAllTotals();
            this._updateProjectEngagement();
            this._updateReportsData();
        },

        _notifyManagerOfChange: function (oEntry, sChangeDescription) {
            MessageBox.information("Change notification sent to manager: " + sChangeDescription);
            console.log("Manager notified of change:", sChangeDescription, oEntry);
        },

        onSaveDraft: function () {
            this._calculateAllTotals();
            this._updateCounts();
            this._updateProjectEngagement();
            this._updateReportsData();
            var oModel = this.getView().getModel();
            var iEntries = oModel.getProperty("/timeEntries").length;
            var fTotalHours = oModel.getProperty("/totalWeekHours");
            MessageToast.show("Timesheet saved successfully! " + iEntries + " entries, " + fTotalHours + " total hours");
            this.getView().byId("timesheetTable").getBinding("items").refresh();
        },

        onSubmitApproval: function () {
            if (this._validateTimesheet()) {
                MessageBox.confirm("Are you sure you want to submit this timesheet for approval? Once submitted, changes will require manager approval.", {
                    title: "Submit for Approval",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            var oModel = this.getView().getModel();
                            var aEntries = oModel.getProperty("/timeEntries");
                            aEntries.forEach(function (oEntry) {
                                oEntry.isApproved = true;
                            });
                            oModel.setProperty("/isSubmitted", true);
                            oModel.setProperty("/timeEntries", aEntries);
                            MessageToast.show("Timesheet submitted for approval");
                            this._updateProjectEngagement();
                            this._updateCounts();
                            this._updateReportsData();
                            this.getView().byId("timesheetTable").getBinding("items").refresh();
                            var oTimesheetData = {
                                currentWeek: oModel.getProperty("/currentWeek"),
                                totalWeekHours: oModel.getProperty("/totalWeekHours"),
                                isSubmitted: oModel.getProperty("/isSubmitted"),
                                timeEntriesCount: oModel.getProperty("/timeEntriesCount"),
                                commentsCount: oModel.getProperty("/commentsCount"),
                                timeEntries: oModel.getProperty("/timeEntries"),
                                dailyTotals: oModel.getProperty("/dailyTotals"),
                                dailyComments: oModel.getProperty("/dailyComments"),
                                assignedProjects: oModel.getProperty("/assignedProjects"),
                                workTypes: oModel.getProperty("/workTypes")
                            };
                            if (this._oRouter) {
                                this._oRouter.navTo("admin", {
                                    timesheetData: encodeURIComponent(JSON.stringify(oTimesheetData))
                                });
                            } else {
                                var oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                                oHashChanger.setHash("/admin");
                                MessageToast.show("Timesheet submitted. Navigation to admin page completed.");
                            }
                        }
                    }.bind(this)
                });
            }
        },

        _validateTimesheet: function () {
            var oModel = this.getView().getModel();
            var oTotals = oModel.getProperty("/dailyTotals");
            var oWeekDates = oModel.getProperty("/weekDates");
            var aEntries = oModel.getProperty("/timeEntries");
            var bIsValid = true;
            var aWarnings = [];
            var aErrors = [];
            aEntries.forEach(function (oEntry, index) {
                if (!oEntry.projectId || oEntry.projectId.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Project is mandatory.");
                }
                if (!oEntry.workType || oEntry.workType.trim() === "") {
                    aErrors.push("Entry " + (index + 1) + ": Work Type is mandatory.");
                }
                if (parseFloat(oEntry.monday) === 0 && parseFloat(oEntry.tuesday) === 0 &&
                    parseFloat(oEntry.wednesday) === 0 && parseFloat(oEntry.thursday) === 0 &&
                    parseFloat(oEntry.friday) === 0 && parseFloat(oEntry.saturday) === 0 &&
                    parseFloat(oEntry.sunday) === 0) {
                    aErrors.push("Entry " + (index + 1) + ": At least one day's hours must be entered.");
                }
            });
            Object.keys(oTotals).forEach(function (sDay) {
                var fHours = oTotals[sDay];
                var sDateKey = sDay + "IsFuture";
                var isFutureDay = oWeekDates[sDateKey];
                if (!isFutureDay && fHours < 8 && fHours > 0) {
                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required for past dates)");
                }
                if (fHours > 24) {
                    bIsValid = false;
                    aErrors.push(sDay + " has more than 24 hours. Please correct the entries.");
                    return false;
                }
            });
            if (aErrors.length > 0) {
                MessageBox.error(aErrors.join("\n"), {
                    title: "Validation Errors",
                    onClose: function () {
                        bIsValid = false;
                    }
                });
                return false;
            }
            if (aWarnings.length > 0) {
                MessageBox.warning(aWarnings.join("\n") + "\n\nYou can still submit, but please ensure you meet the 8-hour requirement for past dates.", {
                    title: "Validation Warnings",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.CANCEL) {
                            bIsValid = false;
                        }
                    }
                });
            }
            return bIsValid;
        },

        onViewReports: function () {
            var oModel = this.getView().getModel();
            var aEngagement = oModel.getProperty("/projectEngagement");
            var sReport = "Progress Reports:\n\n";
            aEngagement.forEach(function (oProject) {
                sReport += "Project: " + oProject.projectName + "\n";
                sReport += "Manager: " + oProject.managerName + "\n";
                sReport += "Total Hours: " + oProject.totalHours + "\n";
                sReport += "Duration: " + oProject.engagementDuration + "\n";
                sReport += "Status: " + oProject.status + "\n\n";
            });
            MessageBox.information(sReport);
        },

        onPreviousWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() - 7);
            this._updateWeekDates(mondayDate);
            // Update the selected date to the Monday of the new week
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));
            // Show notification
            MessageToast.show("The data has been sent to the manager");
        },

        onCurrentWeekTS: function () {
            var today = new Date();
            this._updateWeekDates(today);
            // Update the selected date to today
            var oModel = this.getView().getModel();
            oModel.setProperty("/selectedDate", this._formatDateForModel(today));
            MessageToast.show("Navigated to current week");
        },

        onNextWeekTS: function () {
            var oModel = this.getView().getModel();
            var oWeekDates = oModel.getProperty("/weekDates");
            var mondayDate = new Date(oWeekDates.monday);
            mondayDate.setDate(mondayDate.getDate() + 7);
            this._updateWeekDates(mondayDate);
            // Update the selected date to the Monday of the new week
            oModel.setProperty("/selectedDate", this._formatDateForModel(mondayDate));
            
            // Check if all day fields have 0 hours
            var aEntries = oModel.getProperty("/timeEntries");
            var allZeroHours = aEntries.every(function(entry) {
                return parseFloat(entry.monday) === 0 && 
                       parseFloat(entry.tuesday) === 0 && 
                       parseFloat(entry.wednesday) === 0 && 
                       parseFloat(entry.thursday) === 0 && 
                       parseFloat(entry.friday) === 0 && 
                       parseFloat(entry.saturday) === 0 && 
                       parseFloat(entry.sunday) === 0;
            });
            
            if (allZeroHours) {
                // Clear the time entries if all are zero
                oModel.setProperty("/timeEntries", []);
                MessageToast.show("All entries had 0 hours. Table has been cleared.");
            } else {
                // Check if there's a Leave entry
                var hasLeaveEntry = aEntries.some(function(entry) {
                    return entry.workType === "LEAVE";
                });
                
                if (!hasLeaveEntry) {
                    // Add a Leave entry if none exists
                    var oProject = oModel.getProperty("/assignedProjects")[0];
                    if (oProject) {
                        aEntries.push({
                            id: "leave-" + Date.now(),
                            projectId: oProject.projectId,
                            projectName: oProject.projectName,
                            workType: "LEAVE",
                            workTypeName: "Leave",
                            monday: 0,
                            tuesday: 0,
                            wednesday: 0,
                            thursday: 0,
                            friday: 0,
                            saturday: 0,
                            sunday: 0,
                            comment: "Leave entry",
                            isApproved: false,
                            isFutureDay: false,
                            dailyComments: {
                                monday: "",
                                tuesday: "",
                                wednesday: "",
                                thursday: "",
                                friday: "",
                                saturday: "",
                                sunday: ""
                            }
                        });
                        oModel.setProperty("/timeEntries", aEntries);
                        MessageToast.show("Leave entry added for the week.");
                    }
                }
            }
            
            // Refresh the table
            var oTable = this.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
        },

        onDatePickerChange: function (oEvent) {
            var sDate = oEvent.getParameter("value");
            if (sDate) {
                var selectedDate = new Date(sDate);
                this._updateWeekDates(selectedDate);
                MessageToast.show("Week updated for selected date: " + sDate);
            }
        },

        onPreviousWeek: function () {
            this.onPreviousWeekTS();
        },

        onNextWeek: function () {
            this.onNextWeekTS();
        },

        onToday: function () {
            this.onCurrentWeekTS();
        },

        onSettingsPress: function () {
            MessageBox.information("Timesheet Settings:\n\n- Working hours: 8 hours/day\n- Future bookings allowed for Leave/Training only\n- Manager notifications for approved entry changes");
        },

        onLogoutPress: function () {
            MessageBox.confirm("Are you sure you want to logout?", {
                title: "Logout",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        MessageToast.show("Logged out successfully");
                    }
                }
            });
        }
    });
});



sap.ui.define([

    "sap/ui/core/mvc/Controller",

    "sap/m/MessageBox",

    "sap/m/MessageToast",

    "sap/ui/model/json/JSONModel",

    "sap/ui/model/type/Float",

    "sap/m/Dialog",

    "sap/m/VBox",

    "sap/m/Label",

    "sap/m/ComboBox",

    "sap/m/Input",

    "sap/m/Button",

    "sap/ui/core/Item",

    "sap/ui/core/routing/History",

    "sap/ui/core/Fragment",

    "sap/m/DateRangeSelection",

    "sap/m/CheckBox",

    "sap/m/TextArea",

    "sap/m/SegmentedButton",

    "sap/m/SegmentedButtonItem"

], function (Controller, MessageBox, MessageToast, JSONModel, FloatType, Dialog, VBox, Label,

    ComboBox, Input, Button, Item, History, Fragment, DateRangeSelection, CheckBox, TextArea,

    SegmentedButton, SegmentedButtonItem) {

    "use strict";

    return Controller.extend("admin.com.admin.controller.Employee", {

        onInit: function () {

            this._initializeModel();

            this._initializeCurrentWeek();

            this._calculateAllTotals();

            this._updateCounts();

            this._updateProjectEngagement();

            // Initialize router

            this._oRouter = this.getOwnerComponent().getRouter();

            if (!this._oRouter) {

                this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);

            }

        },

        

        // Formatter function to calculate row total

        formatRowTotal: function (monday, tuesday, wednesday, thursday, friday, saturday, sunday) {

            var total = (parseFloat(monday) || 0) +

                (parseFloat(tuesday) || 0) +

                (parseFloat(wednesday) || 0) +

                (parseFloat(thursday) || 0) +

                (parseFloat(friday) || 0) +

                (parseFloat(saturday) || 0) +

                (parseFloat(sunday) || 0);

            return total.toFixed(2);

        },

        _initializeModel: function () {

            var oModel = new JSONModel({

                currentWeek: "Oct 20 - Oct 26 2025",

                totalWeekHours: "0.00",

                isSubmitted: false,

                timeEntriesCount: "0",

                commentsCount: "0",

                selectedDate: null,

                assignedProjects: [

                    {

                        projectId: "b47ac10b-58cc-4372-a567-0e02b2c3d500",

                        projectName: "E-Commerce Platform",

                        managerName: "Sarah Johnson",

                        status: "Active",

                        startDate: "2024-02-01",

                        endDate: "2024-08-31",

                        allocatedHours: 2400

                    },

                    {

                        projectId: "P002",

                        projectName: "Mobile App - Customer Portal",

                        managerName: "Sarah Johnson",

                        status: "Active",

                        startDate: "2022-10-01",

                        endDate: "2023-02-28",

                        allocatedHours: 3200

                    },

                    {

                        projectId: "P003",

                        projectName: "HR System Upgrade",

                        managerName: "Mike Brown",

                        status: "On Hold",

                        startDate: "2022-08-15",

                        endDate: "2022-11-30",

                        allocatedHours: 1800

                    },

                    {

                        projectId: "e47ac10b-58cc-4372-a567-0e02b2c3d530",

                        projectName: "Leave",

                        managerName: "Sarah Johnson",

                        status: "Active",

                        startDate: "2024-01-01",

                        endDate: "2024-12-31",

                        allocatedHours: 1600

                    }

                ],

                workTypes: [

                    { type: "DESIGN", name: "Designing" },

                    { type: "DEVELOP", name: "Developing" },

                    { type: "TEST", name: "Testing" },

                    { type: "DEPLOY", name: "Deployment" },

                    { type: "MEETING", name: "Meetings" },

                    { type: "DOCUMENTATION", name: "Documentation" },

                    { type: "LEAVE", name: "Leave" },

                    { type: "TRAINING", name: "Training" }

                ],

                timeEntries: [

                    {

                        id: "d47ac10b-58cc-4372-a567-0e02b2c3d522",

                        projectId: "b47ac10b-58cc-4372-a567-0e02b2c3d500",

                        projectName: "E-Commerce Platform",

                        workTypeName: "Designing",

                        workType: "DESIGN",

                        monday: 0,

                        tuesday: 8.0,

                        wednesday: 0,

                        thursday: 0,

                        friday: 0,

                        saturday: 0,

                        sunday: 0,

                        comment: "Created responsive UI components for product catalog",

                        isApproved: true,

                        isFutureDay: false

                    },

                    {

                        id: "d47ac10b-58cc-4372-a567-0e02b2c3d523",

                        projectId: "b47ac10b-58cc-4372-a567-0e02b2c3d500",

                        projectName: "E-Commerce Platform",

                        workTypeName: "Developing",

                        workType: "DEVELOP",

                        monday: 0,

                        tuesday: 0,

                        wednesday: 8.0,

                        thursday: 0,

                        friday: 0,

                        saturday: 0,

                        sunday: 0,

                        comment: "Implemented shopping cart functionality with React",

                        isApproved: true,

                        isFutureDay: false

                    },

                    {

                        id: "d47ac10b-58cc-4372-a567-0e02b2c3d540",

                        projectId: "e47ac10b-58cc-4372-a567-0e02b2c3d530",

                        projectName: "Leave",

                        workTypeName: "Leave",

                        workType: "LEAVE",

                        monday: 0,

                        tuesday: 0,

                        wednesday: 0,

                        thursday: 0,

                        friday: 0,

                        saturday: 0,

                        sunday: 0,

                        comment: "Annual Leave - Family vacation",

                        isApproved: true,

                        isFutureDay: false

                    }

                ],

                dailyTotals: {

                    monday: 0,

                    tuesday: 0,

                    wednesday: 0,

                    thursday: 0,

                    friday: 0,

                    saturday: 0,

                    sunday: 0

                },

                dailyComments: [

                    { day: "Monday", comment: "", lastUpdated: "" },

                    { day: "Tuesday", comment: "Worked on design and development tasks for E-Commerce Platform.", lastUpdated: "2024-10-02 18:00" },

                    { day: "Wednesday", comment: "", lastUpdated: "" },

                    { day: "Thursday", comment: "", lastUpdated: "" },

                    { day: "Friday", comment: "", lastUpdated: "" },

                    { day: "Saturday", comment: "", lastUpdated: "" },

                    { day: "Sunday", comment: "", lastUpdated: "" }

                ],

                projectEngagement: [],

                weekDates: {

                    monday: "2025-10-20",

                    tuesday: "2025-10-21",

                    wednesday: "2025-10-22",

                    thursday: "2025-10-23",

                    friday: "2025-10-24",

                    saturday: "2025-10-25",

                    sunday: "2025-10-26",

                    mondayFormatted: "Oct 20",

                    tuesdayFormatted: "Oct 21",

                    wednesdayFormatted: "Oct 22",

                    thursdayFormatted: "Oct 23",

                    fridayFormatted: "Oct 24",

                    saturdayFormatted: "Oct 25",

                    sundayFormatted: "Oct 26"

                },

                editEntry: {},
                newEntry: {
                    selectedDate: "2025-10-25",
                    projectId: "",
                    workType: "",
                    hours: "8", // Default hours value
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: ""
                },

                newDailyComment: {

                    day: "",

                    comment: ""

                },

                employeeProjectHours: [],

                employeeProjectDurations: [],



                // COMMENT DIALOG DATA

                currentCommentType: "daily",

                selectedDay: "Monday",

                dailyCommentText: "",

                weeklyCommentText: "",

                monthlyCommentText: "",

                currentMonth: "October 2025",

                // Changed from assignees to projects for the first dropdown

                projects: [

                    { id: "b47ac10b-58cc-4372-a567-0e02b2c3d500", name: "E-Commerce Platform" },

                    { id: "P002", name: "Mobile App - Customer Portal" },

                    { id: "P003", name: "HR System Upgrade" },

                    { id: "e47ac10b-58cc-4372-a567-0e02b2c3d530", name: "Leave" }

                ],

                selectedProject: "b47ac10b-58cc-4372-a567-0e02b2c3d500",

                dueDateStart: null,

                dueDateEnd: null,

                // Changed from projects to workTypes for the second dropdown

                workTypes: [

                    { type: "DESIGN", name: "Designing" },

                    { type: "DEVELOP", name: "Developing" },

                    { type: "TEST", name: "Testing" },

                    { type: "DEPLOY", name: "Deployment" },

                    { type: "MEETING", name: "Meetings" },

                    { type: "DOCUMENTATION", name: "Documentation" },

                    { type: "LEAVE", name: "Leave" },

                    { type: "TRAINING", name: "Training" }

                ],

                selectedWorkType: "DESIGN",

                statusOptions: [

                    { key: "todo", text: "To Do" },

                    { key: "inprogress", text: "In Progress" },

                    { key: "done", text: "Done" },

                    { key: "review", text: "Under Review" }

                ],

                selectedStatus: "todo",

                priorityOptions: [

                    { key: "low", text: "Low" },

                    { key: "medium", text: "Medium" },

                    { key: "high", text: "High" },

                    { key: "urgent", text: "Urgent" }

                ],

                selectedPriority: "medium",

                needInput: false,

                newCommentText: "",

                existingComments: [

                    { author: "John Smith", date: "17th Feb 2024", text: "I'll do that task now, you can start working on another task!" },

                    { author: "John Smith", date: "Just Now", text: "Hello!" }

                ],

                // Properties for comment editing

                editCommentText: "",

                editCommentId: ""

            });

            this.getView().setModel(oModel);

            this._calculateAllTotals();

            this._updateCounts();

            this._updateProjectEngagement();

            this._updateReportsData();

        },

        _initializeCurrentWeek: function () {

            var today = new Date("2025-10-27T07:28:00Z");

            var oModel = this.getView().getModel();

            oModel.setProperty("/selectedDate", this._formatDateForModel(today));

            this._updateWeekDates(today);

        },

        _updateWeekDates: function (oDate) {

            var oModel = this.getView().getModel();

            var startDate = new Date(oDate);

            var day = startDate.getDay();

            var diff = startDate.getDate() - day + (day === 0 ? -6 : 1);

            var monday = new Date(startDate.setDate(diff));

            var tuesday = new Date(monday);

            tuesday.setDate(monday.getDate() + 1);

            var wednesday = new Date(monday);

            wednesday.setDate(monday.getDate() + 2);

            var thursday = new Date(monday);

            thursday.setDate(monday.getDate() + 3);

            var friday = new Date(monday);

            friday.setDate(monday.getDate() + 4);

            var saturday = new Date(monday);

            saturday.setDate(monday.getDate() + 5);

            var sunday = new Date(monday);

            sunday.setDate(monday.getDate() + 6);

            var oWeekDates = {

                monday: this._formatDateForModel(monday),

                tuesday: this._formatDateForModel(tuesday),

                wednesday: this._formatDateForModel(wednesday),

                thursday: this._formatDateForModel(thursday),

                friday: this._formatDateForModel(friday),

                saturday: this._formatDateForModel(saturday),

                sunday: this._formatDateForModel(sunday),

                mondayFormatted: this._formatDateDisplay(monday),

                tuesdayFormatted: this._formatDateDisplay(tuesday),

                wednesdayFormatted: this._formatDateDisplay(wednesday),

                thursdayFormatted: this._formatDateDisplay(thursday),

                fridayFormatted: this._formatDateDisplay(friday),

                saturdayFormatted: this._formatDateDisplay(saturday),

                sundayFormatted: this._formatDateDisplay(sunday)

            };

            var sCurrentWeek = this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday) + " " + sunday.getFullYear();

            oModel.setProperty("/weekDates", oWeekDates);

            oModel.setProperty("/currentWeek", sCurrentWeek);

            Object.keys(oWeekDates).forEach(function (sDay) {

                if (sDay.endsWith("Formatted")) return;

                var dayDate = new Date(oWeekDates[sDay]);

                var isFuture = dayDate > new Date("2025-10-27T07:28:00Z");

                oWeekDates[sDay + "IsFuture"] = isFuture;

            });

            oModel.setProperty("/weekDates", oWeekDates);

        },

        _formatDateForModel: function (oDate) {

            return oDate.getFullYear() + "-" +

                ("0" + (oDate.getMonth() + 1)).slice(-2) + "-" +

                ("0" + oDate.getDate()).slice(-2);

        },

        _formatDateDisplay: function (oDate) {

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            return months[oDate.getMonth()] + " " + ("0" + oDate.getDate()).slice(-2);

        },

        _updateCounts: function () {

            var oModel = this.getView().getModel();

            var aEntries = oModel.getProperty("/timeEntries");

            var aComments = oModel.getProperty("/dailyComments");

            var iCommentsWithText = aComments.filter(function (comment) {

                return comment.comment && comment.comment.trim() !== "";

            }).length;

            oModel.setProperty("/timeEntriesCount", aEntries.length.toString());

            oModel.setProperty("/commentsCount", iCommentsWithText.toString());

        },

        // COMMENT DIALOG FUNCTIONS

        onInfoPress: function () {

            if (!this._oCommentOptionsDialog) {

                Fragment.load({

                    id: this.getView().getId(),

                    name: "admin.com.admin.Fragments.CommentOptions",

                    controller: this

                }).then(function (oDialog) {

                    this._oCommentOptionsDialog = oDialog;

                    this.getView().addDependent(this._oCommentOptionsDialog);



                    // Initialize comment data

                    this._initializeCommentData();



                    this._oCommentOptionsDialog.open();

                }.bind(this)).catch(function (oError) {

                    MessageBox.error("Error loading comment dialog. Please try again.");

                });

            } else {

                this._initializeCommentData();

                this._oCommentOptionsDialog.open();

            }

        },

        _initializeCommentData: function () {

            var oModel = this.getView().getModel();



            // Reset form data

            oModel.setProperty("/currentCommentType", "daily");

            oModel.setProperty("/selectedDay", "Monday");

            oModel.setProperty("/dailyCommentText", "");

            oModel.setProperty("/weeklyCommentText", "");

            oModel.setProperty("/monthlyCommentText", "");

            oModel.setProperty("/newCommentText", "");

            oModel.setProperty("/needInput", false);



            // Set default values for dropdowns - use first item from each list

            var aProjects = oModel.getProperty("/projects");

            var aWorkTypes = oModel.getProperty("/workTypes");



            if (aProjects && aProjects.length > 0) {

                oModel.setProperty("/selectedProject", aProjects[0].id);

            }



            if (aWorkTypes && aWorkTypes.length > 0) {

                oModel.setProperty("/selectedWorkType", aWorkTypes[0].type);

            }



            oModel.setProperty("/selectedStatus", "todo");

            oModel.setProperty("/selectedPriority", "medium");



            // Set current date for due date

            var today = new Date();

            var todayStr = today.getFullYear() + "-" +

                ("0" + (today.getMonth() + 1)).slice(-2) + "-" +
                ("0" + today.getDate()).slice(-2);

            oModel.setProperty("/dueDateStart", todayStr);

            oModel.setProperty("/dueDateEnd", todayStr);

        },

        onCommentTypeSelect: function (oEvent) {

            var sKey = oEvent.getParameter("key");

            var oModel = this.getView().getModel();

            oModel.setProperty("/currentCommentType", sKey);



            MessageToast.show("Switched to " + sKey + " comments");

        },

        onAddNewComment: function () {

            var oModel = this.getView().getModel();

            var sNewComment = oModel.getProperty("/newCommentText");



            if (!sNewComment || sNewComment.trim() === "") {

                MessageBox.error("Please enter a comment");

                return;

            }



            // Add new comment to existing comments

            var aExistingComments = oModel.getProperty("/existingComments") || [];

            aExistingComments.push({

                author: "You",

                date: "Just Now",

                text: sNewComment

            });



            oModel.setProperty("/existingComments", aExistingComments);

            oModel.setProperty("/newCommentText", "");



            MessageToast.show("Comment added successfully");

        },

        onSaveCommentOption: function () {

            var oModel = this.getView().getModel();

            var sCommentType = oModel.getProperty("/currentCommentType");



            if (sCommentType === "daily") {

                this._saveDailyComment();

            }

            else if (sCommentType === "weekly") {

                this._saveWeeklyComment();

            }

            else if (sCommentType === "monthly") {

                this._saveMonthlyComment();

            }

        },

        // Add this function to handle saving comments to the timesheet

        _saveCommentToTimesheet: function (sComment, sType, sProjectName, sWorkTypeName) {

            var oModel = this.getView().getModel();

            var aTimeEntries = oModel.getProperty("/timeEntries");



            // Create a new time entry for the comment

            var oCommentEntry = {

                id: "c" + Date.now(), // Unique ID for comment entry

                projectId: "comment", // Special ID for comments

                projectName: sProjectName || "Comment",

                workTypeName: sWorkTypeName || (sType + " Comment"),

                workType: "COMMENT",

                monday: 0,

                tuesday: 0,

                wednesday: 0,

                thursday: 0,

                friday: 0,

                saturday: 0,

                sunday: 0,

                comment: sComment,

                isApproved: true,

                isFutureDay: false,

                isCommentEntry: true // Flag to identify comment entries

            };



            // Add the comment entry to the time entries

            aTimeEntries.push(oCommentEntry);

            oModel.setProperty("/timeEntries", aTimeEntries);



            // Refresh the table

            var oTable = this.getView().byId("timesheetTable");

            if (oTable && oTable.getBinding("items")) {

                oTable.getBinding("items").refresh();

            }



            MessageToast.show(sType + " comment saved to timesheet");

        },

        _saveDailyComment: function () {

            var oModel = this.getView().getModel();

            var sComment = oModel.getProperty("/dailyCommentText");

            var sProject = oModel.getProperty("/selectedProject");

            var sWorkType = oModel.getProperty("/selectedWorkType");

            var sStatus = oModel.getProperty("/selectedStatus");

            var sPriority = oModel.getProperty("/selectedPriority");

            var bNeedInput = oModel.getProperty("/needInput");

            var sSelectedDay = oModel.getProperty("/selectedDay");



            // Validation

            if (!sComment || sComment.trim() === "") {

                MessageBox.error("Please enter a description for the daily comment");

                return;

            }



            if (!sProject) {

                MessageBox.error("Please select a project");

                return;

            }



            if (!sWorkType) {

                MessageBox.error("Please select a work type");

                return;

            }



            // Get display values

            var aProjects = oModel.getProperty("/projects");

            var aWorkTypes = oModel.getProperty("/workTypes");

            var aStatusOptions = oModel.getProperty("/statusOptions");

            var aPriorityOptions = oModel.getProperty("/priorityOptions");



            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });

            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });

            var oSelectedStatus = aStatusOptions.find(function (item) { return item.key === sStatus; });

            var oSelectedPriority = aPriorityOptions.find(function (item) { return item.key === sPriority; });



            // Prepare comment data

            var oCommentData = {

                type: "daily",

                day: sSelectedDay,

                project: oSelectedProject ? oSelectedProject.name : "Unknown",

                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",

                status: oSelectedStatus ? oSelectedStatus.text : "Unknown",

                priority: oSelectedPriority ? oSelectedPriority.text : "Unknown",

                dueDateStart: oModel.getProperty("/dueDateStart"),

                dueDateEnd: oModel.getProperty("/dueDateEnd"),

                description: sComment,

                needInput: bNeedInput,

                timestamp: new Date().toISOString()

            };



            // Log for debugging

            console.log("Saving daily comment:", oCommentData);



            // Format comment for display with both project and work type

            var sFormattedComment = "[" + sSelectedDay + "] " + sComment +

                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +

                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown") +

                "\nStatus: " + (oSelectedStatus ? oSelectedStatus.text : "Unknown") +

                "\nPriority: " + (oSelectedPriority ? oSelectedPriority.text : "Unknown");



            // Update daily comments in the model

            var aDailyComments = oModel.getProperty("/dailyComments") || [];

            var oDayComment = aDailyComments.find(function (comment) {

                return comment.day === sSelectedDay;

            });



            var now = new Date();

            var timeStr = now.toLocaleString('en-US', {

                year: 'numeric',

                month: '2-digit',

                day: '2-digit',

                hour: '2-digit',

                minute: '2-digit',

                hour12: false

            });



            if (oDayComment) {

                oDayComment.comment = sComment;

                oDayComment.lastUpdated = timeStr;

            } else {

                aDailyComments.push({

                    day: sSelectedDay,

                    comment: sComment,

                    lastUpdated: timeStr

                });

            }



            oModel.setProperty("/dailyComments", aDailyComments);

            this._updateCounts();



            // Save comment to timesheet with project and work type

            this._saveCommentToTimesheet(

                sFormattedComment,

                "Daily",

                oSelectedProject ? oSelectedProject.name : "Unknown",

                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"

            );



            if (this._oCommentOptionsDialog) {

                this._oCommentOptionsDialog.close();

            }

        },

        _saveWeeklyComment: function () {

            var oModel = this.getView().getModel();

            var sComment = oModel.getProperty("/weeklyCommentText");

            var sProject = oModel.getProperty("/selectedProject");

            var sWorkType = oModel.getProperty("/selectedWorkType");



            if (!sComment || sComment.trim() === "") {

                MessageBox.error("Please enter a weekly summary");

                return;

            }



            // Get display values

            var aProjects = oModel.getProperty("/projects");

            var aWorkTypes = oModel.getProperty("/workTypes");



            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });

            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });



            var oCommentData = {

                type: "weekly",

                week: oModel.getProperty("/currentWeek"),

                project: oSelectedProject ? oSelectedProject.name : "Unknown",

                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",

                summary: sComment,

                timestamp: new Date().toISOString()

            };



            // Log for debugging

            console.log("Saving weekly comment:", oCommentData);



            // Format comment for display with both project and work type

            var sFormattedComment = "[Weekly Summary - " + oModel.getProperty("/currentWeek") + "]\n" + sComment +

                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +

                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");



            // Add to existing comments as a special entry

            var aExistingComments = oModel.getProperty("/existingComments") || [];

            aExistingComments.push({

                author: "You",

                date: "Weekly Summary - " + new Date().toLocaleDateString(),

                text: "[WEEKLY] " + sComment

            });



            oModel.setProperty("/existingComments", aExistingComments);



            // Save comment to timesheet with project and work type

            this._saveCommentToTimesheet(

                sFormattedComment,

                "Weekly",

                oSelectedProject ? oSelectedProject.name : "Unknown",

                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"

            );



            if (this._oCommentOptionsDialog) {

                this._oCommentOptionsDialog.close();

            }

        },

        _saveMonthlyComment: function () {

            var oModel = this.getView().getModel();

            var sComment = oModel.getProperty("/monthlyCommentText");

            var sProject = oModel.getProperty("/selectedProject");

            var sWorkType = oModel.getProperty("/selectedWorkType");



            if (!sComment || sComment.trim() === "") {

                MessageBox.error("Please enter a monthly review");

                return;

            }



            // Get display values

            var aProjects = oModel.getProperty("/projects");

            var aWorkTypes = oModel.getProperty("/workTypes");



            var oSelectedProject = aProjects.find(function (item) { return item.id === sProject; });

            var oSelectedWorkType = aWorkTypes.find(function (item) { return item.type === sWorkType; });



            var oCommentData = {

                type: "monthly",

                month: oModel.getProperty("/currentMonth"),

                project: oSelectedProject ? oSelectedProject.name : "Unknown",

                workType: oSelectedWorkType ? oSelectedWorkType.name : "Unknown",

                review: sComment,

                timestamp: new Date().toISOString()

            };



            // Log for debugging

            console.log("Saving monthly comment:", oCommentData);



            // Format comment for display with both project and work type

            var sFormattedComment = "[Monthly Review - " + oModel.getProperty("/currentMonth") + "]\n" + sComment +

                "\nProject: " + (oSelectedProject ? oSelectedProject.name : "Unknown") +

                "\nWork Type: " + (oSelectedWorkType ? oSelectedWorkType.name : "Unknown");



            // Add to existing comments as a special entry

            var aExistingComments = oModel.getProperty("/existingComments") || [];

            aExistingComments.push({

                author: "You",

                date: "Monthly Review - " + new Date().toLocaleDateString(),

                text: "[MONTHLY] " + sComment

            });



            oModel.setProperty("/existingComments", aExistingComments);



            // Save comment to timesheet with project and work type

            this._saveCommentToTimesheet(

                sFormattedComment,

                "Monthly",

                oSelectedProject ? oSelectedProject.name : "Unknown",

                oSelectedWorkType ? oSelectedWorkType.name : "Unknown"

            );



            if (this._oCommentOptionsDialog) {

                this._oCommentOptionsDialog.close();

            }

        },

        onCancelCommentOption: function () {

            if (this._oCommentOptionsDialog) {

                this._oCommentOptionsDialog.close();

            }

        },

        // Day selection for daily comments

        onDaySelect: function (oEvent) {

            var oModel = this.getView().getModel();

            var sSelectedKey = oEvent.getParameter("selectedKey");

            oModel.setProperty("/selectedDay", sSelectedKey);



            // Load existing comment for selected day if any

            var aDailyComments = oModel.getProperty("/dailyComments") || [];

            var oDayComment = aDailyComments.find(function (comment) {

                return comment.day === sSelectedKey;

            });



            if (oDayComment && oDayComment.comment) {

                oModel.setProperty("/dailyCommentText", oDayComment.comment);

            } else {

                oModel.setProperty("/dailyCommentText", "");

            }

        },

        // Comment management functions

        onEditComment: function (oEvent) {

            var oButton = oEvent.getSource();

            var oBindingContext = oButton.getBindingContext();

            if (!oBindingContext) return;



            var oEntry = oBindingContext.getObject();

            var oModel = this.getView().getModel();



            // Set the comment text in the model for editing

            oModel.setProperty("/editCommentText", oEntry.comment);

            oModel.setProperty("/editCommentId", oEntry.id);



            if (!this._oEditCommentDialog) {

                Fragment.load({

                    id: this.getView().getId(),

                    name: "admin.com.admin.Fragments.EditComment",

                    controller: this

                }).then(function (oDialog) {

                    this._oEditCommentDialog = oDialog;

                    this.getView().addDependent(this._oEditCommentDialog);

                    this._oEditCommentDialog.open();

                }.bind(this));

            } else {

                this._oEditCommentDialog.open();

            }

        },

        onSaveEditedComment: function () {

            var oModel = this.getView().getModel();

            var sCommentText = oModel.getProperty("/editCommentText");

            var sCommentId = oModel.getProperty("/editCommentId");



            if (!sCommentText || sCommentText.trim() === "") {

                MessageBox.error("Comment cannot be empty");

                return;

            }



            var aTimeEntries = oModel.getProperty("/timeEntries");

            var oCommentEntry = aTimeEntries.find(function (entry) {

                return entry.id === sCommentId;

            });



            if (oCommentEntry) {

                oCommentEntry.comment = sCommentText;

                oModel.setProperty("/timeEntries", aTimeEntries);



                // Refresh the table

                var oTable = this.getView().byId("timesheetTable");

                if (oTable && oTable.getBinding("items")) {

                    oTable.getBinding("items").refresh();

                }



                MessageToast.show("Comment updated successfully");

            }



            if (this._oEditCommentDialog) {

                this._oEditCommentDialog.close();

            }

        },

        onCancelEditComment: function () {

            if (this._oEditCommentDialog) {

                this._oEditCommentDialog.close();

            }

        },

        onDeleteComment: function (oEvent) {

            var oButton = oEvent.getSource();

            var oBindingContext = oButton.getBindingContext();

            if (!oBindingContext) return;



            var oEntry = oBindingContext.getObject();



            MessageBox.confirm("Are you sure you want to delete this comment?", {

                title: "Delete Comment",

                onClose: function (oAction) {

                    if (oAction === MessageBox.Action.OK) {

                        var oModel = this.getView().getModel();

                        var aTimeEntries = oModel.getProperty("/timeEntries");

                        var iIndex = aTimeEntries.findIndex(function (entry) {

                            return entry.id === oEntry.id;

                        });



                        if (iIndex > -1) {

                            aTimeEntries.splice(iIndex, 1);

                            oModel.setProperty("/timeEntries", aTimeEntries);



                            // Refresh the table

                            var oTable = this.getView().byId("timesheetTable");

                            if (oTable && oTable.getBinding("items")) {

                                oTable.getBinding("items").refresh();

                            }



                            MessageToast.show("Comment deleted successfully");

                        }

                    }

                }.bind(this)

            });

        },

        onCommentLiveChange: function (oEvent) {

            // This function can be used for live validation if needed

        },

        // EXISTING FUNCTIONS (keep all your existing functions)

        onTabSelect: function (oEvent) {

            var sKey = oEvent.getParameter("key");

            MessageToast.show("Switched to " + sKey + " tab");



            // If switching to reports tab, update the reports data

            if (sKey === "reports") {

                this._updateReportsData();

            }

        },

        onAddEntry: function () {

            var oModel = this.getView().getModel();
            var oNewEntry = {
                selectedDate: this._formatDateForModel(new Date()),
                projectId: "",
                workType: "",
                hours: "8", // Default hours value
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
                comment: ""
            };
            oModel.setProperty("/newEntry", oNewEntry);
            if (!this._oAddEntryDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.com.admin.Fragments.AddTimeEntry",
                    controller: this
                }).then(function (oDialog) {
                    this._oAddEntryDialog = oDialog;
                    this.getView().addDependent(this._oAddEntryDialog);
                    this._oAddEntryDialog.open();
                }.bind(this));
            } else {
                this._oAddEntryDialog.open();
            }
        },

        // Function to handle date picker change in the fragment
        onEntryDatePickerChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sDate = oDatePicker.getValue();

            if (sDate) {
                var selectedDate = new Date(sDate);
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry/selectedDate", this._formatDateForModel(selectedDate));

                // Check if the selected date is within the current week
                var oWeekDates = oModel.getProperty("/weekDates");
                var monday = new Date(oWeekDates.monday);
                var sunday = new Date(oWeekDates.sunday);

                if (selectedDate < monday || selectedDate > sunday) {
                    MessageBox.warning("The selected date is outside the current week. Please select a date within " +
                        this._formatDateDisplay(monday) + " - " + this._formatDateDisplay(sunday));
                }
            }
        },

        // Function to handle hours change in the fragment
        onFragmentHoursChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();

            // Validate that the input is a number between 0 and 24
            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {
                MessageBox.alert("Hours must be between 0 and 24");
                oSource.setValue("0");
                return;
            }

            // Recalculate totals
            this._calculateAllTotals();
        },

        // Function to save time entry (extracted from onSaveNewEntry)
        _saveTimeEntry: function () {
            var oModel = this.getView().getModel();
            var oNewEntry = oModel.getProperty("/newEntry");

            if (!oNewEntry.projectId || oNewEntry.projectId.trim() === "") {
                MessageBox.error("Please select a project");
                return false;
            }

            if (!oNewEntry.workType || oNewEntry.workType.trim() === "") {
                MessageBox.error("Please select a work type");
                return false;
            }

            if (!oNewEntry.hours || oNewEntry.hours.trim() === "") {
                MessageBox.error("Please select hours");
                return false;
            }

            // Get the selected date and determine the day of the week
            var selectedDate = new Date(oNewEntry.selectedDate);
            var dayOfWeek = selectedDate.getDay(); // 0 is Sunday, 1 is Monday, etc.

            // Map dayOfWeek to our property names
            var dayMap = {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday"
            };

            var dayProperty = dayMap[dayOfWeek];

            // Reset all day hours to 0
            oNewEntry.monday = 0;
            oNewEntry.tuesday = 0;
            oNewEntry.wednesday = 0;
            oNewEntry.thursday = 0;
            oNewEntry.friday = 0;
            oNewEntry.saturday = 0;
            oNewEntry.sunday = 0;

            // Set the selected day's hours
            oNewEntry[dayProperty] = parseFloat(oNewEntry.hours) || 0;

            var totalHours = parseFloat(oNewEntry.hours) || 0;

            if (totalHours === 0) {
                MessageBox.error("Please enter hours for at least one day");
                return false;
            }

            var aEntries = oModel.getProperty("/timeEntries");
            var sNewId = "d47ac10b-58cc-4372-a567-0e02b2c3d" + (500 + aEntries.length);
            var oProject = oModel.getProperty("/assignedProjects").find(function (p) {
                return p.projectId === oNewEntry.projectId;
            });
            var oWorkType = oModel.getProperty("/workTypes").find(function (w) {
                return w.type === oNewEntry.workType;
            });
            var oTimeEntry = {
                id: sNewId,
                projectId: oNewEntry.projectId,
                projectName: oProject ? oProject.projectName : "",
                workType: oNewEntry.workType,
                workTypeName: oWorkType ? oWorkType.name : "",
                monday: parseFloat(oNewEntry.monday || 0),
                tuesday: parseFloat(oNewEntry.tuesday || 0),
                wednesday: parseFloat(oNewEntry.wednesday || 0),
                thursday: parseFloat(oNewEntry.thursday || 0),
                friday: parseFloat(oNewEntry.friday || 0),
                saturday: parseFloat(oNewEntry.saturday || 0),
                sunday: parseFloat(oNewEntry.sunday || 0),
                comment: oNewEntry.comment || "",
                isApproved: false,
                isFutureDay: false
            };

            aEntries.push(oTimeEntry);
            oModel.setProperty("/timeEntries", aEntries);
            this._calculateAllTotals();
            this._updateCounts();
            this._updateProjectEngagement();
            this._updateReportsData();

            var oTable = this.getView().byId("timesheetTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }

            MessageToast.show("Time entry added successfully");
            return true;
        },

        // Modified onSaveNewEntry function
        onSaveNewEntry: function () {
            if (this._saveTimeEntry()) {
                this._oAddEntryDialog.close();
            }
        },

        // New onSaveAndNewEntry function
        onSaveAndNewEntry: function () {
            if (this._saveTimeEntry()) {
                // Reset the form
                var oModel = this.getView().getModel();
                oModel.setProperty("/newEntry", {
                    selectedDate: this._formatDateForModel(new Date()),
                    projectId: "",
                    workType: "",
                    hours: "8", // Default hours value
                    monday: 0,
                    tuesday: 0,
                    wednesday: 0,
                    thursday: 0,
                    friday: 0,
                    saturday: 0,
                    sunday: 0,
                    comment: ""
                });

                // Keep the dialog open for new entry
                MessageToast.show("Time entry saved. Ready for new entry.");
            }
        },

        onCancelNewEntry: function () {
            this._oAddEntryDialog.close();
        },

        onEditEntry: function (oEvent) {

            var oButton = oEvent.getSource();

            var oBindingContext = oButton.getBindingContext();

            if (!oBindingContext) return;

            var oEntry = oBindingContext.getObject();

            var oModel = this.getView().getModel();

            oModel.setProperty("/editEntry", JSON.parse(JSON.stringify(oEntry)));

            if (!this._oEditEntryDialog) {

                Fragment.load({

                    id: this.getView().getId(),

                    name: "admin.com.admin.Fragments.EditTimeEntry",

                    controller: this

                }).then(function (oDialog) {

                    this._oEditEntryDialog = oDialog;

                    this.getView().addDependent(this._oEditEntryDialog);

                    this._oEditEntryDialog.open();

                }.bind(this));

            } else {

                this._oEditEntryDialog.open();

            }

        },

        onCancelEditEntry: function () {

            if (this._oEditEntryDialog) {

                this._oEditEntryDialog.close();

            }

        },

        onSaveEditedEntry: function () {

            var oModel = this.getView().getModel();

            var oEditEntry = oModel.getProperty("/editEntry");

            var aEntries = oModel.getProperty("/timeEntries");

            if (!oEditEntry.projectId || oEditEntry.projectId.trim() === "") {

                MessageBox.error("Please select a project");

                return;

            }

            if (!oEditEntry.workType || oEditEntry.workType.trim() === "") {

                MessageBox.error("Please select a work type");

                return;

            }

            var totalHours = parseFloat(oEditEntry.monday || 0) +

                parseFloat(oEditEntry.tuesday || 0) +

                parseFloat(oEditEntry.wednesday || 0) +

                parseFloat(oEditEntry.thursday || 0) +

                parseFloat(oEditEntry.friday || 0) +

                parseFloat(oEditEntry.saturday || 0) +

                parseFloat(oEditEntry.sunday || 0);

            if (totalHours === 0) {

                MessageBox.error("Please enter hours for at least one day");

                return;

            }

            var iIndex = aEntries.findIndex(function (entry) {

                return entry.id === oEditEntry.id;

            });

            if (iIndex > -1) {

                if (aEntries[iIndex].isApproved) {

                    this._notifyManagerOfChange(aEntries[iIndex], "Time entry modified");

                }

                var oProject = oModel.getProperty("/assignedProjects").find(function (p) {

                    return p.projectId === oEditEntry.projectId;

                });

                var oWorkType = oModel.getProperty("/workTypes").find(function (w) {

                    return w.type === oEditEntry.workType;

                });

                oEditEntry.projectName = oProject ? oProject.projectName : "";

                oEditEntry.workTypeName = oWorkType ? oWorkType.name : "";

                Object.keys(oEditEntry).forEach(function (key) {

                    aEntries[iIndex][key] = oEditEntry[key];

                });

                oModel.setProperty("/timeEntries", aEntries);

                this._calculateAllTotals();

                this._updateProjectEngagement();

                this._updateReportsData();

                var oTable = this.getView().byId("timesheetTable");

                if (oTable && oTable.getBinding("items")) {

                    oTable.getBinding("items").refresh();

                }

                this._oEditEntryDialog.close();

                MessageToast.show("Time entry updated successfully");

            }

        },

        onDeleteEntry: function (oEvent) {

            var oContext = oEvent.getParameter("listItem").getBindingContext();

            if (!oContext) return;

            var oEntry = oContext.getObject();

            if (oEntry.isApproved) {

                MessageBox.warning("Cannot delete approved entry. Please contact your manager.");

                return;

            }

            MessageBox.confirm("Are you sure you want to delete this time entry?", {

                title: "Delete Entry",

                onClose: function (oAction) {

                    if (oAction === MessageBox.Action.OK) {

                        var oModel = this.getView().getModel();

                        var aEntries = oModel.getProperty("/timeEntries");

                        var iIndex = aEntries.findIndex(function (entry) {

                            return entry.id === oEntry.id;

                        });

                        if (iIndex > -1) {

                            aEntries.splice(iIndex, 1);

                            oModel.setProperty("/timeEntries", aEntries);

                            this._calculateAllTotals();

                            this._updateCounts();

                            this._updateProjectEngagement();

                            this._updateReportsData();

                            var oTable = this.getView().byId("timesheetTable");

                            if (oTable && oTable.getBinding("items")) {

                                oTable.getBinding("items").refresh();

                            }

                            MessageToast.show("Time entry deleted");

                        }

                    }

                }.bind(this)

            });

        },

        onHoursChange: function (oEvent) {

            var oSource = oEvent.getSource();

            var sValue = oSource.getValue();

            if (sValue && (parseFloat(sValue) < 0 || parseFloat(sValue) > 24)) {

                MessageBox.alert("Hours must be between 0 and 24");

                oSource.setValue("0");

                return;

            }

            this._calculateAllTotals();

            this._validateDailyHours();

        },

        _calculateAllTotals: function () {

            var oModel = this.getView().getModel();

            var aEntries = oModel.getProperty("/timeEntries");

            var oTotals = {

                monday: 0,

                tuesday: 0,

                wednesday: 0,

                thursday: 0,

                friday: 0,

                saturday: 0,

                sunday: 0

            };

            aEntries.forEach(function (oEntry) {

                oTotals.monday += parseFloat(oEntry.monday) || 0;

                oTotals.tuesday += parseFloat(oEntry.tuesday) || 0;

                oTotals.wednesday += parseFloat(oEntry.wednesday) || 0;

                oTotals.thursday += parseFloat(oEntry.thursday) || 0;

                oTotals.friday += parseFloat(oEntry.friday) || 0;

                oTotals.saturday += parseFloat(oEntry.saturday) || 0;

                oTotals.sunday += parseFloat(oEntry.sunday) || 0;

            });

            var fWeekTotal = Object.values(oTotals).reduce(function (sum, hours) {

                return sum + hours;

            }, 0);

            oModel.setProperty("/dailyTotals", oTotals);

            oModel.setProperty("/totalWeekHours", fWeekTotal.toFixed(2));

            this._updateProjectEngagement();

        },

        _updateProjectEngagement: function () {

            var oModel = this.getView().getModel();

            var aEntries = oModel.getProperty("/timeEntries");

            var aProjects = oModel.getProperty("/assignedProjects");

            var aEngagement = [];

            aProjects.forEach(function (oProject) {

                var aProjectEntries = aEntries.filter(function (oEntry) {

                    return oEntry.projectId === oProject.projectId;

                });

                var fTotalHours = aProjectEntries.reduce(function (total, oEntry) {

                    return total + (parseFloat(oEntry.monday) || 0) +

                        (parseFloat(oEntry.tuesday) || 0) +

                        (parseFloat(oEntry.wednesday) || 0) +

                        (parseFloat(oEntry.thursday) || 0) +

                        (parseFloat(oEntry.friday) || 0) +

                        (parseFloat(oEntry.saturday) || 0) +

                        (parseFloat(oEntry.sunday) || 0);

                }, 0);

                aEngagement.push({

                    projectName: oProject.projectName,

                    managerName: oProject.managerName,

                    totalHours: fTotalHours.toFixed(2),

                    engagementDuration: this._calculateEngagementDuration(oProject.startDate, oProject.endDate),

                    status: oProject.status

                });

            }.bind(this));

            oModel.setProperty("/projectEngagement", aEngagement);

        },

        _updateReportsData: function () {

            var oModel = this.getView().getModel();

            var aEntries = oModel.getProperty("/timeEntries");

            var aProjects = oModel.getProperty("/assignedProjects");

            var today = new Date("2025-10-27T07:28:00Z");

            // Booked Hours Overview

            var aEmployeeProjectHours = aProjects.map(function (project) {

                var aProjectEntries = aEntries.filter(function (entry) {

                    return entry.projectId === project.projectId;

                });

                var bookedHours = aProjectEntries.reduce(function (total, entry) {

                    return total + (parseFloat(entry.monday) || 0) +

                        (parseFloat(entry.tuesday) || 0) +

                        (parseFloat(entry.wednesday) || 0) +

                        (parseFloat(entry.thursday) || 0) +

                        (parseFloat(entry.friday) || 0) +

                        (parseFloat(entry.saturday) || 0) +

                        (parseFloat(entry.sunday) || 0);

                }, 0);

                var utilization = project.allocatedHours > 0 ? Math.round((bookedHours / project.allocatedHours) * 100) : 0;

                return {

                    projectName: project.projectName,

                    allocatedHours: project.allocatedHours,

                    bookedHours: bookedHours,

                    remainingHours: project.allocatedHours - bookedHours,

                    utilization: utilization

                };

            });

            oModel.setProperty("/employeeProjectHours", aEmployeeProjectHours);

            // Project Engagement Duration

            var aEmployeeProjectDurations = aProjects.map(function (project) {

                var startDate = new Date(project.startDate);

                var endDate = new Date(project.endDate);

                var durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

                var daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

                var timelineStatus = project.status === "Completed" ? "Completed" :

                    project.status === "On Hold" ? "On Hold" :

                        daysRemaining < 0 ? "Delayed" :

                            daysRemaining < 14 ? "At Risk" : "On Track";

                return {

                    projectName: project.projectName,

                    startDate: project.startDate,

                    endDate: project.endDate,

                    durationDays: durationDays,

                    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,

                    timelineStatus: timelineStatus

                };

            });

            oModel.setProperty("/employeeProjectDurations", aEmployeeProjectDurations);

        },

        _calculateEngagementDuration: function (sStartDate, sEndDate) {

            var oStart = new Date(sStartDate);

            var oEnd = new Date(sEndDate);

            var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 +

                (oEnd.getMonth() - oStart.getMonth());

            if (iMonths === 0) {

                var iDays = Math.floor((oEnd - oStart) / (1000 * 60 * 60 * 24));

                return iDays + " days";

            } else if (iMonths < 12) {

                return iMonths + " months";

            } else {

                var iYears = Math.floor(iMonths / 12);

                var iRemainingMonths = iMonths % 12;

                return iYears + " year" + (iYears > 1 ? "s" : "") +

                    (iRemainingMonths > 0 ? " " + iRemainingMonths + " months" : "");

            }

        },

        _validateDailyHours: function () {

            var oModel = this.getView().getModel();

            var oTotals = oModel.getProperty("/dailyTotals");

            var oWeekDates = oModel.getProperty("/weekDates");

            var today = new Date("2025-10-27T07:28:00Z");

            var aWarnings = [];

            Object.keys(oTotals).forEach(function (sDay) {

                var fHours = oTotals[sDay];

                var sDateKey = sDay + "IsFuture";

                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {

                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required)");

                }

            });

            if (aWarnings.length > 0) {

                console.warn("Hours validation warnings:", aWarnings);

            }

        },

        onProjectSelect: function (oEvent) {

            var oSelectedItem = oEvent.getParameter("listItem");

            if (oSelectedItem) {

                var oProject = oSelectedItem.getBindingContext().getObject();

                MessageToast.show("Selected project: " + oProject.projectName + " (Manager: " + oProject.managerName + ")");

            }

        },

        onProjectChange: function (oEvent) {

            var sSelectedKey = oEvent.getParameter("selectedKey");

            var oEntry = oEvent.getSource().getBindingContext().getObject();

            if (oEntry.isApproved) {

                this._notifyManagerOfChange(oEntry, "Project changed to: " + sSelectedKey);

            }

            this._calculateAllTotals();

            this._updateProjectEngagement();

            this._updateReportsData();

        },

        onWorkTypeChange: function (oEvent) {

            var sSelectedKey = oEvent.getParameter("selectedKey");

            var oEntry = oEvent.getSource().getBindingContext().getObject();

            if (oEntry.isApproved) {

                this._notifyManagerOfChange(oEntry, "Work type changed to: " + sSelectedKey);

            }

            this._calculateAllTotals();

            this._updateProjectEngagement();

            this._updateReportsData();

        },

        _notifyManagerOfChange: function (oEntry, sChangeDescription) {

            MessageBox.information("Change notification sent to manager: " + sChangeDescription);

            console.log("Manager notified of change:", sChangeDescription, oEntry);

        },

        onSaveDraft: function () {

            this._calculateAllTotals();

            this._updateCounts();

            this._updateProjectEngagement();

            this._updateReportsData();

            var oModel = this.getView().getModel();

            var iEntries = oModel.getProperty("/timeEntries").length;

            var fTotalHours = oModel.getProperty("/totalWeekHours");

            MessageToast.show("Timesheet saved successfully! " + iEntries + " entries, " + fTotalHours + " total hours");

            this.getView().byId("timesheetTable").getBinding("items").refresh();

        },

        onSubmitApproval: function () {

            if (this._validateTimesheet()) {

                MessageBox.confirm("Are you sure you want to submit this timesheet for approval? Once submitted, changes will require manager approval.", {

                    title: "Submit for Approval",

                    onClose: function (oAction) {

                        if (oAction === MessageBox.Action.OK) {

                            var oModel = this.getView().getModel();

                            var aEntries = oModel.getProperty("/timeEntries");

                            aEntries.forEach(function (oEntry) {

                                oEntry.isApproved = true;

                            });

                            oModel.setProperty("/isSubmitted", true);

                            oModel.setProperty("/timeEntries", aEntries);

                            MessageToast.show("Timesheet submitted for approval");

                            this._updateProjectEngagement();

                            this._updateCounts();

                            this._updateReportsData();

                            this.getView().byId("timesheetTable").getBinding("items").refresh();

                            var oTimesheetData = {

                                currentWeek: oModel.getProperty("/currentWeek"),

                                totalWeekHours: oModel.getProperty("/totalWeekHours"),

                                isSubmitted: oModel.getProperty("/isSubmitted"),

                                timeEntriesCount: oModel.getProperty("/timeEntriesCount"),

                                commentsCount: oModel.getProperty("/commentsCount"),

                                timeEntries: oModel.getProperty("/timeEntries"),

                                dailyTotals: oModel.getProperty("/dailyTotals"),

                                dailyComments: oModel.getProperty("/dailyComments"),

                                assignedProjects: oModel.getProperty("/assignedProjects"),

                                workTypes: oModel.getProperty("/workTypes")

                            };

                            if (this._oRouter) {

                                this._oRouter.navTo("admin", {

                                    timesheetData: encodeURIComponent(JSON.stringify(oTimesheetData))

                                });

                            } else {

                                var oHashChanger = sap.ui.core.routing.HashChanger.getInstance();

                                oHashChanger.setHash("/admin");

                                MessageToast.show("Timesheet submitted. Navigation to admin page completed.");

                            }

                        }

                    }.bind(this)

                });

            }

        },

        _validateTimesheet: function () {

            var oModel = this.getView().getModel();

            var oTotals = oModel.getProperty("/dailyTotals");

            var oWeekDates = oModel.getProperty("/weekDates");

            var aEntries = oModel.getProperty("/timeEntries");

            var bIsValid = true;

            var aWarnings = [];

            var aErrors = [];

            aEntries.forEach(function (oEntry, index) {

                if (!oEntry.projectId || oEntry.projectId.trim() === "") {

                    aErrors.push("Entry " + (index + 1) + ": Project is mandatory.");

                }

                if (!oEntry.workType || oEntry.workType.trim() === "") {

                    aErrors.push("Entry " + (index + 1) + ": Work Type is mandatory.");

                }

                if (parseFloat(oEntry.monday) === 0 && parseFloat(oEntry.tuesday) === 0 &&

                    parseFloat(oEntry.wednesday) === 0 && parseFloat(oEntry.thursday) === 0 &&

                    parseFloat(oEntry.friday) === 0 && parseFloat(oEntry.saturday) === 0 &&

                    parseFloat(oEntry.sunday) === 0) {

                    aErrors.push("Entry " + (index + 1) + ": At least one day's hours must be entered.");

                }

            });

            Object.keys(oTotals).forEach(function (sDay) {

                var fHours = oTotals[sDay];

                var sDateKey = sDay + "IsFuture";

                var isFutureDay = oWeekDates[sDateKey];

                if (!isFutureDay && fHours < 8 && fHours > 0) {

                    aWarnings.push(sDay + " has only " + fHours.toFixed(2) + " hours (minimum 8 required for past dates)");

                }

                if (fHours > 24) {

                    bIsValid = false;

                    aErrors.push(sDay + " has more than 24 hours. Please correct the entries.");

                    return false;

                }

            });

            if (aErrors.length > 0) {

                MessageBox.error(aErrors.join("\n"), {

                    title: "Validation Errors",

                    onClose: function () {

                        bIsValid = false;

                    }

                });

                return false;

            }

            if (aWarnings.length > 0) {

                MessageBox.warning(aWarnings.join("\n") + "\n\nYou can still submit, but please ensure you meet the 8-hour requirement for past dates.", {

                    title: "Validation Warnings",

                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],

                    onClose: function (oAction) {

                        if (oAction === MessageBox.Action.CANCEL) {

                            bIsValid = false;

                        }

                    }

                });

            }

            return bIsValid;

        },

        onViewReports: function () {

            var oModel = this.getView().getModel();

            var aEngagement = oModel.getProperty("/projectEngagement");

            var sReport = "Progress Reports:\n\n";

            aEngagement.forEach(function (oProject) {

                sReport += "Project: " + oProject.projectName + "\n";

                sReport += "Manager: " + oProject.managerName + "\n";

                sReport += "Total Hours: " + oProject.totalHours + "\n";

                sReport += "Duration: " + oProject.engagementDuration + "\n";

                sReport += "Status: " + oProject.status + "\n\n";

            });

            MessageBox.information(sReport);

        },

        onPreviousWeekTS: function () {

            var oModel = this.getView().getModel();

            var oWeekDates = oModel.getProperty("/weekDates");

            var mondayDate = new Date(oWeekDates.monday);

            mondayDate.setDate(mondayDate.getDate() - 7);

            this._updateWeekDates(mondayDate);

            MessageToast.show("Navigated to previous week");

        },

        onCurrentWeekTS: function () {

            this._updateWeekDates(new Date("2025-10-27T07:28:00Z"));

            MessageToast.show("Navigated to current week");

        },

        onNextWeekTS: function () {

            var oModel = this.getView().getModel();

            var oWeekDates = oModel.getProperty("/weekDates");

            var mondayDate = new Date(oWeekDates.monday);

            mondayDate.setDate(mondayDate.getDate() + 7);

            this._updateWeekDates(mondayDate);

            MessageToast.show("Navigated to next week");

        },

        onDatePickerChange: function (oEvent) {

            var sDate = oEvent.getParameter("value");

            if (sDate) {

                var selectedDate = new Date(sDate);

                this._updateWeekDates(selectedDate);

                MessageToast.show("Week updated for selected date: " + sDate);

            }

        },

        onPreviousWeek: function () {

            this.onPreviousWeekTS();

        },

        onNextWeek: function () {

            this.onNextWeekTS();

        },

        onToday: function () {

            this.onCurrentWeekTS();

        },

        onSettingsPress: function () {

            MessageBox.information("Timesheet Settings:\n\n- Working hours: 8 hours/day\n- Future bookings allowed for Leave/Training only\n- Manager notifications for approved entry changes");

        },

        onLogoutPress: function () {

            MessageBox.confirm("Are you sure you want to logout?", {

                title: "Logout",

                onClose: function (oAction) {

                    if (oAction === MessageBox.Action.OK) {

                        MessageToast.show("Logged out successfully");

                    }

                }

            });

        }

    });

});
