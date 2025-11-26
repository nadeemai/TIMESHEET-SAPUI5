UPDATED CODE 4

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MenuItem",
    "sap/m/Menu",
    "sap/m/Dialog",
    "sap/m/MessageBox",


], (Controller, JSONModel, BusyIndicator, Fragment, MenuItem, Dialog, Menu, MessageToast, MessageBox) => {
    "use strict";

    return Controller.extend("employee.controller.Employee", {

        onInit: function () {
            var oView = this.getView(); // ✅ capture view reference
            var oModel = new sap.ui.model.json.JSONModel({
                selectedDate: this._formatDateForModel(new Date()),
                dailySummary: [],
                totalWeekHours: "0.00",
                currentWeek: "",
                isSubmitted: false,
                timeEntriesCount: 0,
                commentsCount: 0,
                timeEntries: [],
                hoursWorked: 0,
                isTaskDisabled: false,
                newEntry: {},
                projects: [],
                nonProjectTypeName: "",
                nonProjects: [],
                workTypes: [],
                workType: "",
                dailyTotals: {
                    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
                    friday: 0, saturday: 0, sunday: 0
                },
                weekDates: this._generateWeekDates(new Date()),
            });
            oView.setModel(oModel, "timeEntryModel");

            // Load time entries
            this._loadTimeEntriesFromBackend();

            //    this._checkCurrentUser();
            // this._loadWeekEntries(today);

            // Load projects
            var oProjectModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            oProjectModel.read("/MyProjects", {
                success: function (oData) {
                    var results = oData.d ? oData.d.results : oData.results;
                    var mappedProjects = results.map(function (item) {
                        return {
                            projectName: item.projectName,
                            status: item.status,
                            managerName: item.projectOwner && item.projectOwner.Name ? item.projectOwner.Name : "N/A"
                        };
                    });

                    var oJSONModel = new sap.ui.model.json.JSONModel();
                    oJSONModel.setData({ assignedProjects: mappedProjects });
                    oView.setModel(oJSONModel, "assignedProjects");
                }.bind(this), // important: bind `this` if needed
                error: function (err) {
                    console.error("Failed to load projects", err);
                }
            });

            this._loadReportData(oProjectModel, oView);

        },


        


        _getCurrentWeekMonday: function () {
            let today = new Date();
            let day = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
            let diff = day === 0 ? -6 : 1 - day; // go back to Monday
            let monday = new Date(today);
            monday.setDate(today.getDate() + diff);
            monday.setHours(0, 0, 0, 0);
            return monday;
        },
        _loadReportData: function (oModel, oView) {

            oModel.read("/BookedHoursOverview", {
                success: function (oData) {

                    var bookedHours = oData.d ? oData.d.results : oData.results;

                    var oBookedHoursModel = new sap.ui.model.json.JSONModel();
                    oBookedHoursModel.setData({ employeeProjectHours: bookedHours });

                    oView.setModel(oBookedHoursModel, "bookedHoursModel");
                },
                error: function (err) {
                    console.error("Failed to load Booked Hours Overview", err);
                }
            });

            // 2️Project Engagement Duration
            oModel.read("/ProjectEngagementDuration", {
                success: function (oData) {
                    var durations = oData.d ? oData.d.results : oData.results;

                    var oDurationModel = new sap.ui.model.json.JSONModel();
                    oDurationModel.setData({ employeeProjectDurations: durations });

                    oView.setModel(oDurationModel, "durationModel");
                },
                error: function (err) {
                    console.error("Failed to load Project Engagement Duration", err);
                }
            });
        },


        _generateWeekDates: function (oCurrentDate) {
            var oStart = new Date(oCurrentDate);
            oStart.setDate(oCurrentDate.getDate() - oCurrentDate.getDay() + 1); // Monday start

            var oWeekDates = {};
            var aDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

            aDays.forEach((sDay, i) => {
                var oDate = new Date(oStart);
                oDate.setDate(oStart.getDate() + i);

                oWeekDates[sDay] = oDate;
                oWeekDates[sDay + "Formatted"] = this._formatDateForDisplay(oDate);
            });

            return oWeekDates;
        },

      _hasZeroHourEntry: function (dailyTotals) {
    if (!dailyTotals) return false;

    const totals = [
        dailyTotals.monday,
        dailyTotals.tuesday,
        dailyTotals.wednesday,
        dailyTotals.thursday,
        dailyTotals.friday,
        dailyTotals.saturday,
        dailyTotals.sunday
    ];

    return totals.every(t => Number(t) === 0);
},


        _loadTimeEntriesFromBackend: function () {
            let oODataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            let oView = this.getView();
            let oModel = oView.getModel("timeEntryModel");

            if (!oODataModel) {
                console.error("No OData model found");
                return;
            }

            BusyIndicator.show(0);

            // Set current week
            let monday = this._getCurrentWeekMonday();
            let selectedDateStr = monday.toISOString().split("T")[0];

            this._fetchWeekBoundaries(selectedDateStr)
                .then(week => {

                    let weekStart = week.getWeekBoundaries.weekStart;
                    let weekEnd = week.getWeekBoundaries.weekEnd;

                    this._updateWeekDates(new Date(weekStart));

                     oODataModel.read("/MyTimesheets", {
                        success: function (oData) {
                            BusyIndicator.hide();

                            let allResults = oData.results || [];
                            let totalWeekHoursSum = allResults.reduce((sum, item) => {
                                let hrs = parseFloat(item.totalWeekHours) || 0;
                                return sum + hrs;
                            }, 0);

                            let oModel = this.getView().getModel("timeEntryModel");
                            oModel.setProperty("/totalWeekHours", totalWeekHoursSum);
                            let weekDates = oModel.getProperty("/weekDates");

                            // Compare values ignoring OData Date format noise



                            let toDate = d => new Date(d); // convert "2025-11-17" to full Date object

                            let filtered = allResults.filter(item => {
                                let itemStart = item.weekStartDate ? toDate(item.weekStartDate) : null;
                                let itemEnd = item.weekEndDate ? toDate(item.weekEndDate) : null;

                                return itemStart?.getTime() === weekStart.getTime() &&
                                    itemEnd?.getTime() === weekEnd.getTime();
                            });




                            let formatted = filtered.map(item => {

                                // Always ensure projectName holds the visible name
                                let finalName =
                                    item.projectName && item.projectName.trim() !== ""
                                        ? item.projectName
                                        : (item.nonProjectTypeName || "");

                                return {
                                    id: item.ID,
                                    totalWeekHours: item.totalWeekHours,
                                    projectId: item.project_ID,
                                    nonProjectId: item.nonProjectType_ID,

                                    // IMPORTANT: only this is bound to the table column
                                    projectName: finalName,

                                    // Keep originals if needed for edit dialog
                                    originalProjectName: item.projectName,
                                    originalNonProjectName: item.nonProjectTypeName,

                                    workType: item.task,
                                    status: item.status,

                                    weekStart: item.weekStartDate,
                                    weekEnd: item.weekEndDate,

                                    mondayHours: item.mondayHours,
                                    tuesdayHours: item.tuesdayHours,
                                    wednesdayHours: item.wednesdayHours,
                                    thursdayHours: item.thursdayHours,
                                    fridayHours: item.fridayHours,
                                    saturdayHours: item.saturdayHours,
                                    sundayHours: item.sundayHours,

                                    mondayTaskDetails: item.mondayTaskDetails,
                                    tuesdayTaskDetails: item.tuesdayTaskDetails,
                                    wednesdayTaskDetails: item.wednesdayTaskDetails,
                                    thursdayTaskDetails: item.thursdayTaskDetails,
                                    fridayTaskDetails: item.fridayTaskDetails,
                                    saturdayTaskDetails: item.saturdayTaskDetails,
                                    sundayTaskDetails: item.sundayTaskDetails,

                                    dates: weekDates
                                };
                            });


                            oModel.setProperty("/timeEntries", formatted);

                            let dailyTotals = this._calculateDailyTotals(formatted);
                            oModel.setProperty("/dailyTotals", dailyTotals);

                            // NEW: Check delete button visibility
// let showDelete = this._hasZeroHourEntry(dailyTotals);
// oModel.setProperty("/showDeleteButton", showDelete);

                            let totalWeekHours = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
                            oModel.setProperty("/totalWeekHours", totalWeekHours.toFixed(2));

                            let table = oView.byId("timesheetTable");
                            table?.getBinding("items")?.refresh(true);

                        }.bind(this),

                        error: function (err) {
                            BusyIndicator.hide();
                            console.error(err);
                            MessageToast.show("Failed to load timesheet");
                        }
                    });

                })
                .catch(err => {
                    BusyIndicator.hide();
                    console.error(err);
                    MessageToast.show("Week boundary fetch failed");
                });

        },


        // Separate function to calculate daily totals
        _calculateDailyTotals: function (timeEntries) {
            let totals = {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0
            };

            timeEntries.forEach(entry => {
                totals.monday += parseFloat(entry.mondayHours || 0);
                totals.tuesday += parseFloat(entry.tuesdayHours || 0);
                totals.wednesday += parseFloat(entry.wednesdayHours || 0);
                totals.thursday += parseFloat(entry.thursdayHours || 0);
                totals.friday += parseFloat(entry.fridayHours || 0);
                totals.saturday += parseFloat(entry.saturdayHours || 0);
                totals.sunday += parseFloat(entry.sundayHours || 0);
            });

            return totals;
        },


        _formatDateForModel: function (oDate) {
            return oDate.getFullYear() + "-" +
                ("0" + (oDate.getMonth() + 1)).slice(-2) + "-" +
                ("0" + oDate.getDate()).slice(-2);
        },
        _getCurrentWeekDates: function () {
            let today = new Date();
            let day = today.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat

            // Calculate Monday of the current week
            let diffToMonday = day === 0 ? -6 : 1 - day;
            let monday = new Date(today);
            monday.setDate(today.getDate() + diffToMonday);

            // Helper to format YYYY-MM-DD
            let format = d => d.toISOString().split("T")[0];

            let mondayStr = format(monday);
            let sundayStr = format(new Date(monday.getTime() + 6 * 86400000));

            return {
                weekStart: mondayStr,
                weekEnd: sundayStr,

                monday: mondayStr,
                tuesday: format(new Date(monday.getTime() + 1 * 86400000)),
                wednesday: format(new Date(monday.getTime() + 2 * 86400000)),
                thursday: format(new Date(monday.getTime() + 3 * 86400000)),
                friday: format(new Date(monday.getTime() + 4 * 86400000)),
                saturday: format(new Date(monday.getTime() + 5 * 86400000)),
                sunday: sundayStr
            };
        },


        _formatDateForDisplay: function (oDate) {
            if (!oDate) return "";
            // convert string to Date if needed
            let dateObj = (typeof oDate === "string") ? new Date(oDate) : oDate;
            let options = { month: "short", day: "numeric" };
            return dateObj.toLocaleDateString("en-US", options); // e.g., "Nov 17, 25"
        },

        onCancelNewEntry: function () {
            this._oAddEntryDialog.close();
        },
        _isFutureDate: function (selectedDateStr, weekStart, weekEnd) {
            let d = new Date(selectedDateStr);
            return d > new Date(weekEnd); // anything beyond this week
        },


        onEntryDatePickerChange: function (oEvent) {
    var that = this;
    var oModel = this.getView().getModel("timeEntryModel");
    var oServiceModel = this.getOwnerComponent().getModel("timesheetServiceV2");
    var value = oEvent.getParameter("value");
    if (!value) return;

    var day = this._dayPropertyFromDate(value); // "monday", "saturday", etc.
    var newEntry = oModel.getProperty("/newEntry") || {};
    newEntry.selectedDate = value;
    newEntry.day = day;
    oModel.setProperty("/newEntry", newEntry);

    // Load data
    var loadProjects = new Promise(resolve => {
        oServiceModel.read("/MyProjects", {
            success: oData => {
                let projects = (oData.results || []).map(p => ({
                    id: p.ID,
                    name: p.projectName,
                    isNonProject: false
                }));
                oModel.setProperty("/projects", projects);
                resolve();
            },
            error: () => { oModel.setProperty("/projects", []); resolve(); }
        });
    });

    var loadNonProjects = new Promise(resolve => {
        oServiceModel.read("/AvailableNonProjectTypes", {
            success: oData => {
                let nonProjects = (oData.results || []).map(np => ({
                    id: np.ID,
                    name: np.typeName,
                    isNonProject: true,
                    isLeave: np.typeName.toLowerCase().includes("leave") || np.typeName === "Sick Leave"
                }));
                oModel.setProperty("/nonProjects", nonProjects);
                resolve();
            },
            error: () => { oModel.setProperty("/nonProjects", []); resolve(); }
        });
    });

    var loadTasks = new Promise(resolve => {
        oServiceModel.read("/AvailableTaskTypes", {
            success: oData => {
                let tasks = (oData.results || []).map(t => ({
                    type: t.code,
                    name: t.name
                }));
                oModel.setProperty("/workTypes", tasks);
                resolve();
            },
            error: () => { oModel.setProperty("/workTypes", []); resolve(); }
        });
    });

    Promise.all([loadProjects, loadNonProjects, loadTasks]).then(() => {
        let allProjects = oModel.getProperty("/projects") || [];
        let allNonProjects = oModel.getProperty("/nonProjects") || [];
        let allTasks = oModel.getProperty("/workTypes") || [];

        let isWeekend = day === "saturday" || day === "sunday";
        let weekInfo = that._getCurrentWeekDates();
        let isFuture = that._isFutureDate(value, weekInfo.weekStart, weekInfo.weekEnd);

        let projectsToShow = [];

        if (isWeekend) {
            // Weekend: Show all real projects + Non-Leave non-projects (e.g., Training, On-Call)
            let allowedNonProjects = allNonProjects.filter(np => !np.isLeave);

            projectsToShow = [
                ...allProjects.map(p => ({ id: p.id, name: p.name, isNonProject: false })),
                ...allowedNonProjects.map(np => ({ id: np.id, name: np.name, isNonProject: true }))
            ];

            // Task field: enabled only if real project selected later
            oModel.setProperty("/isTaskDisabled", true);
            oModel.setProperty("/tasksToShow", []);
        }
        else if (isFuture) {
            // Future date (any day): Only Non-Projects (including Leave)
            projectsToShow = allNonProjects.map(np => ({
                id: np.id,
                name: np.name,
                isNonProject: true
            }));
            oModel.setProperty("/tasksToShow", []);
            oModel.setProperty("/isTaskDisabled", true);
        }
        else {
            // Normal weekday: Show everything
            projectsToShow = [
                ...allProjects.map(p => ({ id: p.id, name: p.name, isNonProject: false })),
                ...allNonProjects.map(np => ({ id: np.id, name: np.name, isNonProject: true }))
            ];
            oModel.setProperty("/isTaskDisabled", true); // enabled only on real project select
            oModel.setProperty("/tasksToShow", []);
        }

        oModel.setProperty("/projectsToShow", projectsToShow);

        // Reset selection if current choice is no longer valid
        let currentId = newEntry.projectId || newEntry.nonProjectTypeID;
        let valid = projectsToShow.some(p => p.id === currentId);
        if (!valid) {
            newEntry.projectId = "";
            newEntry.projectName = "";
            newEntry.nonProjectTypeID = "";
            newEntry.nonProjectTypeName = "";
            newEntry.workType = "";
            oModel.setProperty("/newEntry", newEntry);
            oModel.setProperty("/isTaskDisabled", true);
            oModel.setProperty("/tasksToShow", []);
        }
    });
},

        _fetchWeekBoundaries: function (selectedDateStr) {
            var oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            return new Promise((resolve, reject) => {
                oModel.callFunction("/getWeekBoundaries", {
                    method: "GET",
                    urlParameters: { workDate: selectedDateStr },
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: reject
                });
            });
        },

        onAddEntry: function () {
            var that = this;
            var oModel = this.getView().getModel("timeEntryModel");
            var oServiceModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var today = new Date();
            var startWeekDate = this._currentWeekStartDate || new Date();
            var selectedDateStr = this._formatDateForModel(startWeekDate);

            // Initialize newEntry with empty/default values
            oModel.setProperty("/newEntry", {
                selectedDate: selectedDateStr,
                projectId: "",               // will hold MyProject ID
                projectName: "",             // will hold MyProject Name
                nonProjectTypeID: "",        // will hold NonProject ID
                nonProjectTypeName: "",      // will hold NonProject Name
                workType: "",
                hours: "",
                taskDetails: "",
                dailyComments: {}
            });

            // Load Projects
            var loadProjects = new Promise(function (resolve) {
                oServiceModel.read("/MyProjects", {
                    success: function (oData) {
                        var aProjects = oData.results.map(p => ({
                            projectId: p.ID,
                            projectName: p.projectName
                        }));
                        oModel.setProperty("/projects", aProjects);
                        resolve();
                    },
                    error: function () {
                        oModel.setProperty("/projects", []);
                        resolve();
                    }
                });
            });

            // Load Non-Projects
            var loadNonProjects = new Promise(function (resolve) {
                oServiceModel.read("/AvailableNonProjectTypes", {
                    success: function (oData) {
                        var aNonProjects = oData.results.map(np => ({
                            nonProjectTypeID: np.ID,
                            nonProjectTypeName: np.typeName
                        }));
                        oModel.setProperty("/nonProjects", aNonProjects);
                        resolve();
                    },
                    error: function () {
                        oModel.setProperty("/nonProjects", []);
                        resolve();
                    }
                });
            });

            // Load Task types
            var loadTasks = new Promise(function (resolve) {
                oServiceModel.read("/AvailableTaskTypes", {
                    success: function (oData) {
                        var aTasks = oData.results.map(t => ({
                            type: t.code,
                            name: t.name
                        }));
                        oModel.setProperty("/workTypes", aTasks);
                        resolve();
                    },
                    error: function () {
                        oModel.setProperty("/workTypes", []);
                        resolve();
                    }
                });
            });

            // Open dialog after all promises
            Promise.all([loadProjects, loadNonProjects, loadTasks]).then(function () {
                var startWeekDate = that._currentWeekStartDate || new Date(); // Monday of displayed week
                var today = new Date();
                today.setHours(0, 0, 0, 0); // ignore time
                startWeekDate.setHours(0, 0, 0, 0);

                var isFutureWeek = startWeekDate > today;
                var allProjects = oModel.getProperty("/projects") || [];
                var allNonProjects = oModel.getProperty("/nonProjects") || [];

                if (isFutureWeek) {
                    // Future week → only NON projects
                    var projectsToShow = allNonProjects.map(np => ({
                        id: np.nonProjectTypeID,
                        name: np.nonProjectTypeName,
                        isNonProject: true
                    }));
                    oModel.setProperty("/projectsToShow", projectsToShow);
                    oModel.setProperty("/tasksToShow", []);
                    oModel.setProperty("/isTaskDisabled", true);
                } else {
                    // Current week → show all projects
                    var projectsToShow = [
                        ...allProjects.map(p => ({ id: p.projectId, name: p.projectName, isNonProject: false })),
                        ...allNonProjects.map(np => ({ id: np.nonProjectTypeID, name: np.nonProjectTypeName, isNonProject: true }))
                    ];
                    oModel.setProperty("/projectsToShow", projectsToShow);
                    oModel.setProperty("/tasksToShow", oModel.getProperty("/workTypes") || []);
                    oModel.setProperty("/isTaskDisabled", true); // can adjust if needed
                }

                // oModel.setProperty("/projectsToShow", projectsToShow);
                // oModel.setProperty("/tasksToShow", oModel.getProperty("/workTypes") || []);
                // oModel.setProperty("/isTaskDisabled", true);

                if (!that._oAddEntryDialog) {
                    that._oAddEntryDialog = sap.ui.xmlfragment(
                        that.getView().getId(),
                        "employee.Fragments.AddTimeEntry",
                        that
                    );
                    that.getView().addDependent(that._oAddEntryDialog);
                }

                // 🔥 Reset fragment fields here
                that._oAddEntryDialog.getContent().forEach(function (control) {
                    if (control.setValue) control.setValue("");
                    if (control.setSelectedKey) control.setSelectedKey("");
                    if (control.setSelectedIndex) control.setSelectedIndex(-1);
                });

                that._oAddEntryDialog.open();
            });

        },


        // Handler for project/non-project selection
        onProjectChange: function (oEvent) {
    var oModel = this.getView().getModel("timeEntryModel");
    var oSelectedItem = oEvent.getSource().getSelectedItem();
    if (!oSelectedItem) return;

    var key = oSelectedItem.getKey();
    var text = oSelectedItem.getText();
    var projectsToShow = oModel.getProperty("/projectsToShow") || [];
    var selected = projectsToShow.find(p => p.id === key);
    if (!selected) return;

    var newEntry = oModel.getProperty("/newEntry") || {};

    if (selected.isNonProject) {
        // Non-project selected → disable task
        oModel.setProperty("/newEntry/nonProjectTypeID", key);
        oModel.setProperty("/newEntry/nonProjectTypeName", text);
        oModel.setProperty("/newEntry/projectId", "");
        oModel.setProperty("/newEntry/projectName", "");
        oModel.setProperty("/newEntry/workType", "");
        oModel.setProperty("/tasksToShow", []);
        oModel.setProperty("/isTaskDisabled", true);
    } else {
        // Real project selected → enable task dropdown
        oModel.setProperty("/newEntry/projectId", key);
        oModel.setProperty("/newEntry/projectName", text);
        oModel.setProperty("/newEntry/nonProjectTypeID", "");
        oModel.setProperty("/newEntry/nonProjectTypeName", "");
        oModel.setProperty("/newEntry/workType", "");

        oModel.setProperty("/tasksToShow", oModel.getProperty("/workTypes") || []);
        oModel.setProperty("/isTaskDisabled", false);
    }

    oModel.setProperty("/newEntry", newEntry);
},
        onSaveNewEntry: function () {
            var oModel = this.getView().getModel("timeEntryModel");
            var oNewEntry = oModel.getProperty("/newEntry") || {};
            var that = this;

            // if (!this._validateMandatoryFields(oNewEntry)) return false;

            var hoursForDay = parseFloat(oNewEntry.hours) || 0;
            if (hoursForDay <= 0 || hoursForDay > 15) {
                sap.m.MessageBox.error("Hours must be between 0 and 15");
                return false;
            }

            var selectedDateStr = oNewEntry.selectedDate;
            var dayProp = this._dayPropertyFromDate(selectedDateStr);
            var hoursProp = dayProp + "Hours";
            var taskProp = dayProp + "TaskDetails";

            // Prepare payload
            var newRow = {
                project_ID: null,
                nonProjectType_ID: null,
                projectName: oNewEntry.projectName || "",
                nonProjectTypeName: oNewEntry.nonProjectTypeName,
                nonProjectTypeID: oNewEntry.nonProjectTypeID,
                task: oNewEntry.workType || "",
                status: "Draft",
                isBillable: oNewEntry.isBillable,
                mondayHours: "0.00", mondayTaskDetails: "", mondayDate: null,
                tuesdayHours: "0.00", tuesdayTaskDetails: "", tuesdayDate: null,
                wednesdayHours: "0.00", wednesdayTaskDetails: "", wednesdayDate: null,
                thursdayHours: "0.00", thursdayTaskDetails: "", thursdayDate: null,
                fridayHours: "0.00", fridayTaskDetails: "", fridayDate: null,
                saturdayHours: "0.00", saturdayTaskDetails: "", saturdayDate: null,
                sundayHours: "0.00", sundayTaskDetails: "", sundayDate: null
            };

            // Set hours and task for selected day
            newRow[hoursProp] = hoursForDay;
            newRow[taskProp] = oNewEntry.taskDetails || "";

            // Decide project vs non-project
            if (oNewEntry.isBillable) {
                // non-project
                newRow.nonProjectType_ID = oNewEntry.projectId;
                newRow.project_ID = null;
            } else {
                // real project
                newRow.project_ID = oNewEntry.projectId;
                newRow.nonProjectType_ID = null;
            }

            // Persist
            this._fetchWeekBoundaries(selectedDateStr)
                .then(weekData => that._persistToBackend(newRow, selectedDateStr, weekData))
                .then(() => {
                    that._loadTimeEntriesFromBackend();
                    sap.m.MessageToast.show("Timesheet saved!");
                })
                .catch(err => {
                    console.error("❌ Error while creating entry: ", err);
                    sap.m.MessageBox.error("Failed to save timesheet.");
                });

            return true;
        },

        _resetNewEntryFields: function () {
    let oModel = this.getView().getModel("timeEntryModel");

    oModel.setProperty("/newEntry", {
        projectId: "",
        projectName: "",
        nonProjectTypeID: "",
        nonProjectTypeName: "",
        workType: "",
        isBillable: false,
        taskDetails: "",
        hours: "",
        selectedDate: oModel.getProperty("/newEntry/selectedDate") // keep same date
    });
},

        onSaveAndNewEntry: function () {
    var oModel = this.getView().getModel("timeEntryModel");
    var oNewEntry = oModel.getProperty("/newEntry") || {};
    var that = this;

    // Validate hours
    var hoursForDay = parseFloat(oNewEntry.hours) || 0;
    if (hoursForDay <= 0 || hoursForDay > 15) {
        sap.m.MessageBox.error("Hours must be between 0 and 15");
        return false;
    }

    var selectedDateStr = oNewEntry.selectedDate;
    var dayProp = this._dayPropertyFromDate(selectedDateStr);
    var hoursProp = dayProp + "Hours";
    var taskProp = dayProp + "TaskDetails";

    // Prepare new row
    var newRow = {
        project_ID: null,
        nonProjectType_ID: null,
        projectName: oNewEntry.projectName || "",
        nonProjectTypeName: oNewEntry.nonProjectTypeName,
        nonProjectTypeID: oNewEntry.nonProjectTypeID,
        task: oNewEntry.workType || "",
        status: "Draft",
        isBillable: oNewEntry.isBillable,
        mondayHours: "0.00", mondayTaskDetails: "", mondayDate: null,
        tuesdayHours: "0.00", tuesdayTaskDetails: "", tuesdayDate: null,
        wednesdayHours: "0.00", wednesdayTaskDetails: "", wednesdayDate: null,
        thursdayHours: "0.00", thursdayTaskDetails: "", thursdayDate: null,
        fridayHours: "0.00", fridayTaskDetails: "", fridayDate: null,
        saturdayHours: "0.00", saturdayTaskDetails: "", saturdayDate: null,
        sundayHours: "0.00", sundayTaskDetails: "", sundayDate: null
    };

    // Set selected day's values
    newRow[hoursProp] = hoursForDay;
    newRow[taskProp] = oNewEntry.taskDetails || "";

    // Switch project mode
    if (oNewEntry.isBillable) {
        newRow.nonProjectType_ID = oNewEntry.projectId;
    } else {
        newRow.project_ID = oNewEntry.projectId;
    }

    // Main pipeline (same as Save)
    this._fetchWeekBoundaries(selectedDateStr)
        .then(weekData => that._persistToBackendNew(newRow, selectedDateStr, weekData))
        .then(() => {
            that._loadTimeEntriesFromBackend();

            // 🔥 Do NOT close dialog
            // that._oAddEntryDialog.close(); ❌ removed

            // 🔄 Instead reset fields for new entry
            that._resetNewEntryFields();

            sap.m.MessageToast.show("Saved! Add another entry.");
        })
        .catch(err => {
            console.error("❌ Error while saving entry: ", err);
            sap.m.MessageBox.error("Failed to save timesheet.");
        });

    return true;
},
 _persistToBackendNew: async function (entry, selectedDateStr, weekData) {
            var oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            let that = this;
            var dayProp = this._dayPropertyFromDate(selectedDateStr);
            if (!dayProp) return Promise.reject("Invalid day property");

            var oNewEntry = this.getView().getModel("timeEntryModel").getProperty("/newEntry") || {};
            var hours = Number(entry[dayProp + "Hours"]) || 0;
            var task = oNewEntry.taskDetails || "";
            entry[dayProp + "TaskDetails"] = task;

            // 🔹 Always compute week boundary for selected date
            let weekBoundary = await this._getWeekStartEndOData(selectedDateStr);
            console.log("Week boundary:", weekBoundary);

            let weekStart = weekBoundary.weekStart;
            let weekEnd = weekBoundary.weekEnd;




            // day map
            let dayMap = {
                monday: "mondayDate",
                tuesday: "tuesdayDate",
                wednesday: "wednesdayDate",
                thursday: "thursdayDate",
                friday: "fridayDate",
                saturday: "saturdayDate",
                sunday: "sundayDate"
            };
            let dayDateField = dayMap[dayProp];

            function toODataDate(str) {
                return `/Date(${new Date(str).getTime()})/`;
            }

            var oUser = this.getOwnerComponent().getModel("currentUser").getData();
            let employeeID = oUser.id;

            var payloadFull = {
                employee_ID: employeeID,
                weekStartDate: weekStart,
                weekEndDate: weekEnd,
                project_ID: entry.project_ID || null,
                projectName: entry.projectName,
                nonProjectType_ID: entry.nonProjectTypeID,
                nonProjectTypeName: entry.nonProjectTypeName,
                task: entry.task,
                status: "Draft",
                isBillable: true,
                mondayHours: entry.mondayHours, mondayTaskDetails: entry.mondayTaskDetails || "", mondayDate: null,
                tuesdayHours: entry.tuesdayHours, tuesdayTaskDetails: entry.tuesdayTaskDetails || "", tuesdayDate: null,
                wednesdayHours: entry.wednesdayHours, wednesdayTaskDetails: entry.wednesdayTaskDetails || "", wednesdayDate: null,
                thursdayHours: entry.thursdayHours, thursdayTaskDetails: entry.thursdayTaskDetails || "", thursdayDate: null,
                fridayHours: entry.fridayHours, fridayTaskDetails: entry.fridayTaskDetails || "", fridayDate: null,
                saturdayHours: entry.saturdayHours, saturdayTaskDetails: entry.saturdayTaskDetails || "", saturdayDate: null,
                sundayHours: entry.sundayHours, sundayTaskDetails: entry.sundayTaskDetails || "", sundayDate: null
            };

            payloadFull[dayDateField] = toODataDate(selectedDateStr);

            var payloadUpdate = {
                [`${dayProp}Hours`]: hours.toFixed(2),
                [`${dayProp}TaskDetails`]: task
            };

            return new Promise((resolve, reject) => {
                oModel.read("/MyTimesheets", {
                    filters: [new sap.ui.model.Filter({ path: "employee_ID", operator: "EQ", value1: employeeID })],
                    success: function (oData) {
                        let items = oData?.results || [];

                        // 🔹 Calculate total hours for this day/column
                        // Convert OData date "/Date(1731887400000)/" → "2025-11-18"
                        function normalizeDate(d) {
                            if (!d) return null;
                            try {
                                return new Date(d).toISOString().split("T")[0]; // → "2025-11-17"
                            } catch (e) {
                                return null;
                            }
                        }

                        let dayMap = {
                            monday: "mondayDate",
                            tuesday: "tuesdayDate",
                            wednesday: "wednesdayDate",
                            thursday: "thursdayDate",
                            friday: "fridayDate",
                            saturday: "saturdayDate",
                            sunday: "sundayDate"
                        };

                        let dayDateField = dayMap[dayProp];

                        // Filter for same DATE only
                        let filteredItems = items.filter(i => {
                            let storedDate = normalizeDate(i[dayDateField]);
                            return storedDate && storedDate === selectedDateStr;
                        });

                        // Sum only hours of that date
                        let currentTotal = filteredItems.reduce((sum, i) =>
                            sum + (Number(i[dayProp + "Hours"]) || 0), 0
                        );

                        // If same task exists, subtract before re-adding
                        let exist = filteredItems.find(x => x.task === payloadFull.task);
                        if (exist) {
                            currentTotal -= Number(exist[dayProp + "Hours"]) || 0;
                        }

                        let dailyTotals = oModel.getProperty("/dailyTotals") || {};
                        let currentTotalForDay = Number(dailyTotals[dayProp] || 0);
                        let newHours = Number(hours) || 0;

                        // DAILY LIMIT CHECK → Max 15 hrs per day
                        let newTotal = currentTotal + Number(hours);

                        if (newTotal > 15) {
                            sap.m.MessageBox.error(
                                `Woah steady there 😅 You can only log 15 hours max on ${selectedDateStr}.`
                            );
                            if (that._oAddEntryDialog) {
                                that._oAddEntryDialog.close();
                            }
                            return;
                        }

                        // ---------------- PREVENT DUPLICATE PROJECT + TASK FOR SAME DATE ----------------
                        // let duplicate = items.find(i => {
                        //     let sameProject = 
                        //         (i.project_ID && i.project_ID === entry.project_ID) ||
                        //         (i.nonProjectType_ID && i.nonProjectType_ID === entry.nonProjectTypeID);

                        //     let sameTask = i.task === entry.task;

                        //     return sameProject && sameTask;
                        // });

                        // if (duplicate) {
                        //     sap.m.MessageBox.error(
                        //         "Bruh… you already logged this project & task for this date. No duplicates allowed. 😅"
                        //     );
                        //     if (that._oAddEntryDialog) {
                        //         that._oAddEntryDialog.close();
                        //     }
                        //     return;
                        // }



                        if (exist) {
                            // Update existing
                            oModel.update("/MyTimesheets(guid'" + exist.ID + "')", payloadUpdate, {
                                success: function (oData) {
                                    if (that._oAddEntryDialog) { that._oAddEntryDialog.close(); }
                                    sap.m.MessageToast.show("Timesheet updated successfully!");
                                    resolve(oData);
                                },
                                error: reject
                            });
                        } else {
                            // Create new
                           oModel.create("/MyTimesheets", payloadFull, {
    success: function (data) {

        // RESET FORM MODEL COMPLETELY
        let timeEntryModel = that.getView().getModel("timeEntryModel");

        // Reset newEntry object (project, nonproject, task, hours, taskDetails, etc.)
        timeEntryModel.setProperty("/newEntry", {
            project_ID: null,
            projectName: "",
            nonProjectTypeID: null,
            nonProjectTypeName: "",
            task: "",
            taskDetails: "",
            mondayHours: null,
            tuesdayHours: null,
            wednesdayHours: null,
            thursdayHours: null,
            fridayHours: null,
            saturdayHours: null,
            sundayHours: null
        });

        // Reset project/task dropdown lists
        oModel.setProperty("/projectsToShow", []);
        oModel.setProperty("/tasksToShow", []);

        // Reset hours & taskDetails on entry object
        entry[dayProp + "Hours"] = null;
        entry[dayProp + "TaskDetails"] = "";

        // RESET SELECTED DATE BACK TO ORIGINAL DATE
        // timeEntryModel.setProperty("/selectedDate", selectedDateStr);

        // If dialog exists → close & reopen cleanly
        // if (that._oAddEntryDialog) {
        //     that._oAddEntryDialog.close();
        // }

        sap.m.MessageToast.show("Timesheet saved! Form reset successfully.");
        resolve(data);
    },

    error: function (err) {
        sap.m.MessageBox.error("Failed to save timesheet. Check mandatory fields.");
        reject(err);
    }
});

                        }
                    },
                    error: reject
                });
            });
        },

        _getWeekStartEndOData: async function (dateStr) {
            if (!dateStr) {
                console.warn("No date provided to _getWeekStartEndOData");
                return { weekStart: null, weekEnd: null };
            }

            // Convert short MM/DD/YY → YYYY-MM-DD so backend understands
            function normalizeInput(d) {
                if (/^\d{2}\/\d{2}\/\d{2}$/.test(d)) {
                    let [mm, dd, yy] = d.split("/");
                    return `20${yy}-${mm}-${dd}`; // → "2025-11-26"
                }
                return d; // return untouched YYYY-MM-DD or DD/MM/YYYY
            }

            let normalizedDate = normalizeInput(dateStr);

            try {
                let oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
                let result = await new Promise((resolve, reject) => {
                    oModel.callFunction("/getWeekBoundaries", {
                        method: "GET",
                        urlParameters: { workDate: normalizedDate },
                        success: resolve,
                        error: reject
                    });
                });

                // Ensure backend returned valid boundaries
                if (!result?.weekStart || !result?.weekEnd) {
                    console.warn("Backend did not return a valid week boundary for:", dateStr);
                    return { weekStart: null, weekEnd: null };
                }

                return {
                    weekStart: result.weekStart, // e.g. "2025-11-17"
                    weekEnd: result.weekEnd      // e.g. "2025-11-23"
                };

            } catch (err) {
                console.error("Failed fetching week boundaries from backend:", err);
                return { weekStart: null, weekEnd: null };
            }
        },

      onDeleteRows: function (oEvent) {
    let row = oEvent.getSource().getBindingContext("timeEntryModel").getObject();
    this._deleteEntryIfZero(row);
},

_deleteEntryIfZero: function (entry) {

    sap.ui.core.BusyIndicator.show(0);

    const dayKeys = [
        "mondayHours","tuesdayHours","wednesdayHours",
        "thursdayHours","fridayHours","saturdayHours","sundayHours"
    ];

    // Check this ONE row only
    let allZero = dayKeys.every(day => Number(entry[day] || 0) === 0);

    if (!allZero) {
        sap.m.MessageBox.information("Cannot delete — this row has hours.");
        sap.ui.core.BusyIndicator.hide();
        return;
    }

    // If all hours = 0 → DELETE
    const oOData = this.getOwnerComponent().getModel("timesheetServiceV2");
    const sPath = "/MyTimesheets('" + entry.id + "')";
    const that = this;

    oOData.remove(sPath, {
        success: function () {
            // Remove locally without refreshing the whole page
            let aEntries = that.getView().getModel("timeEntryModel").getProperty("/timeEntries") || [];
            let filtered = aEntries.filter(e => e.id !== entry.id);

            that.getView().getModel("timeEntryModel").setProperty("/timeEntries", filtered);

            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageToast.show("Deleted successfully.");
        },
        error: function (err) {
            console.error("Delete failed", err);
            sap.ui.core.BusyIndicator.hide();
        }
    });
},
       _persistToBackend: async function (entry, selectedDateStr, weekData) {
    var oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
    let that = this;
    var dayProp = this._dayPropertyFromDate(selectedDateStr);
    if (!dayProp) return Promise.reject("Invalid day property");

    var oNewEntry = this.getView().getModel("timeEntryModel").getProperty("/newEntry") || {};
    var hours = Number(entry[dayProp + "Hours"]) || 0;
    var task = oNewEntry.taskDetails || "";
    entry[dayProp + "TaskDetails"] = task;

    // Always compute week boundary
    let weekBoundary = await this._getWeekStartEndOData(selectedDateStr);
    let weekStart = weekBoundary.weekStart;
    let weekEnd = weekBoundary.weekEnd;

    // Day map
    let dayMap = {
        monday: "mondayDate",
        tuesday: "tuesdayDate",
        wednesday: "wednesdayDate",
        thursday: "thursdayDate",
        friday: "fridayDate",
        saturday: "saturdayDate",
        sunday: "sundayDate"
    };
    let dayDateField = dayMap[dayProp];

    function toODataDate(str) {
        return `/Date(${new Date(str).getTime()})/`;
    }

    var oUser = this.getOwnerComponent().getModel("currentUser").getData();
    let employeeID = oUser.id;

    var payloadFull = {
        employee_ID: employeeID,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        project_ID: entry.project_ID || null,
        projectName: entry.projectName,
        nonProjectType_ID: entry.nonProjectTypeID,
        nonProjectTypeName: entry.nonProjectTypeName,
        task: entry.task,
        status: "Draft",
        isBillable: true,
        mondayHours: entry.mondayHours, mondayTaskDetails: entry.mondayTaskDetails || "", mondayDate: null,
        tuesdayHours: entry.tuesdayHours, tuesdayTaskDetails: entry.tuesdayTaskDetails || "", tuesdayDate: null,
        wednesdayHours: entry.wednesdayHours, wednesdayTaskDetails: entry.wednesdayTaskDetails || "", wednesdayDate: null,
        thursdayHours: entry.thursdayHours, thursdayTaskDetails: entry.thursdayTaskDetails || "", thursdayDate: null,
        fridayHours: entry.fridayHours, fridayTaskDetails: entry.fridayTaskDetails || "", fridayDate: null,
        saturdayHours: entry.saturdayHours, saturdayTaskDetails: entry.saturdayTaskDetails || "", saturdayDate: null,
        sundayHours: entry.sundayHours, sundayTaskDetails: entry.sundayTaskDetails || "", sundayDate: null
    };

    payloadFull[dayDateField] = toODataDate(selectedDateStr);

    return new Promise((resolve, reject) => {
        oModel.read("/MyTimesheets", {
            filters: [new sap.ui.model.Filter({ path: "employee_ID", operator: "EQ", value1: employeeID })],

            success: function (oData) {
                let items = oData?.results || [];

                // Convert OData date -> yyyy-mm-dd
                function normalizeDate(d) {
                    if (!d) return null;
                    try {
                        return new Date(d).toISOString().split("T")[0];
                    } catch (e) {
                        return null;
                    }
                }

                let dayMap = {
                    monday: "mondayDate",
                    tuesday: "tuesdayDate",
                    wednesday: "wednesdayDate",
                    thursday: "thursdayDate",
                    friday: "fridayDate",
                    saturday: "saturdayDate",
                    sunday: "sundayDate"
                };

                let dayDateField = dayMap[dayProp];

                // Filter for same DATE only
                let filteredItems = items.filter(i => {
                    let storedDate = normalizeDate(i[dayDateField]);
                    return storedDate && storedDate === selectedDateStr;
                });

                // Sum only hours for limit validation
                let currentTotal = filteredItems.reduce((sum, i) =>
                    sum + (Number(i[dayProp + "Hours"]) || 0), 0
                );

                let newTotal = currentTotal + Number(hours);

                if (newTotal > 15) {
                    sap.m.MessageBox.error(
                        `You can only log 15 hours max on ${selectedDateStr}.`
                    );
                    if (that._oAddEntryDialog) {
                        that._oAddEntryDialog.close();
                    }
                    return;
                }

                // ---------------- ALWAYS CREATE (update removed fully) ----------------
                oModel.create("/MyTimesheets", payloadFull, {
                    success: function (data) {
                        if (that._oAddEntryDialog) { that._oAddEntryDialog.close(); }
                        oModel.setProperty("/projectsToShow", []);
                        oModel.setProperty("/tasksToShow", []);
                        sap.m.MessageToast.show("Timesheet saved!");
                        resolve(data);
                    },
                    error: function (err) {
                        sap.m.MessageBox.error("Failed to save timesheet. Check mandatory fields.");
                        reject(err);
                    }
                });
            },
            error: reject
        });
    });
},




        validateDailyHours: async function (employeeId, workDate, hoursToAdd, existingTaskId = null) {
            let entries = await SELECT.from("MyTimesheets")
                .where({ employee_ID: employeeId, workDate: workDate });

            let total = 0;

            for (let e of entries) {
                total += Number(e.hours || 0);
            }

            if (existingTaskId) {
                let found = entries.find(x => x.ID === existingTaskId);
                if (found) {
                    total -= Number(found.hours || 0);
                }
            }

            return (total + hoursToAdd) <= 15;
        },

        _getWeekStartEndOData: async function (dateStr) {
            if (!dateStr) {
                console.warn("No date provided to _getWeekStartEndOData");
                return { weekStart: null, weekEnd: null };
            }

            let parsed = this._parseToDate(dateStr);
            if (!parsed) {
                return { weekStart: null, weekEnd: null };
            }

            // Determine if this selected date is in current week
            let today = new Date();
            let selectedWeek = this._getWeekRange(parsed);
            let currentWeek = this._getWeekRange(today);

            let isCurrentWeek =
                selectedWeek.start === currentWeek.start &&
                selectedWeek.end === currentWeek.end;

            if (isCurrentWeek) {
                console.warn("Selected date is in CURRENT week → Using Backend Boundaries");
                return await this._callBackendWeekBoundaryAPI(parsed);
            }

            console.warn("Selected date is NOT current week → Using Local Calculation");
            return this._calculateWeekBoundaryFromDate(parsed);
        },
        _parseToDate: function (dateStr) {
            try {
                let d;

                if (dateStr.includes("-")) {
                    let p = dateStr.split("-");
                    if (p.length !== 3) return null;
                    d = new Date(p[0], p[1] - 1, p[2]);
                } else if (dateStr.includes("/")) {
                    let p = dateStr.split("/");
                    if (p.length !== 3) return null;
                    let f = Number(p[0]), s = Number(p[1]), t = Number(p[2]);
                    if (f > 12) {
                        d = new Date(t < 100 ? 2000 + t : t, s - 1, f); // DD/MM/YYYY
                    } else {
                        d = new Date(t < 100 ? 2000 + t : t, f - 1, s); // MM/DD/YYYY
                    }
                } else return null;

                return isNaN(d.getTime()) ? null : d;
            } catch {
                return null;
            }
        },
        _calculateWeekBoundaryFromDate: function (date) {
            let day = date.getDay();
            let diff = (day === 0 ? -6 : 1 - day);

            let monday = new Date(date);
            monday.setHours(5, 30, 0, 0);
            monday.setDate(date.getDate() + diff);

            let sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            return {
                weekStart: `/Date(${monday.getTime()})/`,
                weekEnd: `/Date(${sunday.getTime()})/`
            };
        },
        _getWeekRange: function (date) {
            let d = new Date(date);
            let diff = (d.getDay() === 0 ? -6 : 1 - d.getDay());

            let monday = new Date(d);
            monday.setDate(d.getDate() + diff);

            let sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            let fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

            return { start: fmt(monday), end: fmt(sunday) };
        },

        // -------------- helper functions -------------------
        _callBackendWeekBoundaryAPI: function (jsDateObj) {
            return new Promise((resolve, reject) => {
                try {
                    if (!(jsDateObj instanceof Date) || isNaN(jsDateObj.getTime())) {
                        console.warn("Invalid date supplied to backend week boundary call.");
                        return resolve({ weekStart: null, weekEnd: null });
                    }

                    let yyyy = jsDateObj.getFullYear();
                    let mm = String(jsDateObj.getMonth() + 1).padStart(2, "0");
                    let dd = String(jsDateObj.getDate()).padStart(2, "0");
                    let formatted = `${yyyy}-${mm}-${dd}`;   // Backend-friendly format

                    let oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
                    let sPath = `/getWeekBoundaries?date='${formatted}'`;

                    oModel.read(sPath, {
                        success: (oData) => {
                            if (oData && oData.getWeekBoundaries.weekStart && oData.getWeekBoundaries.weekEnd) {
                                resolve({
                                    weekStart: oData.getWeekBoundaries.weekStart,
                                    weekEnd: oData.getWeekBoundaries.weekEnd
                                });
                            } else {
                                console.warn("Backend returned no week boundary values");
                                resolve({ weekStart: null, weekEnd: null });
                            }
                        },
                        error: (err) => {
                            console.error("Backend week boundary error:", err);
                            resolve({ weekStart: null, weekEnd: null });
                        }
                    });
                } catch (err) {
                    console.error("Unhandled error calling week boundary API:", err);
                    resolve({ weekStart: null, weekEnd: null });
                }
            });
        },


        /**
         * Convert "YYYY-MM-DD" (or Date) to OData date string "YYYY-MM-DDT00:00:00"
         */
        _formatDateForOData: function (dateStr) {
            if (!dateStr) return null;

            let [dd, mm, yyyy] = dateStr.split("/");
            return `datetime('${yyyy}-${mm}-${dd}T00:00:00')`;
        },


        /**
         * Return day property name for a given "YYYY-MM-DD"
         */
        _dayPropertyFromDate: function (dateStr) {
            if (!dateStr) return undefined;

            let day, month, year;

            // Normalize: trim extra spaces
            dateStr = dateStr.trim();

            // Case 1: YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                [year, month, day] = dateStr.split("-");
            }

            // Case 2: DD/MM/YYYY or DD/MM/YY
            else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
                let parts = dateStr.split("/");

                // Fix reversed input like MM/DD/YY
                let p1 = parseInt(parts[0], 10);
                let p2 = parseInt(parts[1], 10);

                // If first part can be month and second is >12 → swap (user typo)
                if (p1 <= 12 && p2 > 12) {
                    parts = [parts[1], parts[0], parts[2]];
                }

                day = parts[0].padStart(2, "0");
                month = parts[1].padStart(2, "0");
                year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
            }

            else {
                return undefined;
            }

            // Build VALID date → this fixes next month/year transitions
            let dateObj = new Date(Number(year), Number(month) - 1, Number(day));

            // Validate the letructed date strictly
            if (
                isNaN(dateObj.getTime()) ||
                dateObj.getFullYear() !== Number(year) ||
                dateObj.getMonth() + 1 !== Number(month) ||
                dateObj.getDate() !== Number(day)
            ) {
                return undefined;
            }

            let map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            return map[dateObj.getDay()];
        },






        //Overflow button
        //  onDayOverflowPress: function (oEvent) {
        //     var oButton = oEvent.getSource();
        //     var sDay = oButton.data("day");
        //     var oContext = oButton.getBindingContext("timeEntryModel");

        //     if (!oContext) {
        //         sap.m.MessageToast.show("Unable to get entry data");
        //         return;
        //     }

        //     var oEntry = oContext.getObject();
        //     this._currentEditEntry = oEntry;
        //     this._currentEditDay = sDay;

        //     // 🧩 Use ActionSheet instead of Menu
        //     if (!this._oDayActionSheet) {
        //         this._oDayActionSheet = new sap.m.ActionSheet({
        //             placement: sap.m.PlacementType.Auto,
        //             buttons: [
        //                 new sap.m.Button({
        //                     text: "Edit Time",
        //                     icon: "sap-icon://edit",
        //                     press: this.onEditDayHours.bind(this)
        //                 })
        //             ]
        //         });
        //         this.getView().addDependent(this._oDayActionSheet);
        //     }

        //     this._oDayActionSheet.openBy(oButton);
        // },

        // onDeleteDayHours: function () {
        //     var oEntry = this._currentEditEntry;
        //     var sDay = this._currentEditDay;

        //     if (!oEntry || !sDay) {
        //         sap.m.MessageToast.show("Unable to delete. Please try again.");
        //         return;
        //     }

        //     var fCurrentHours = parseFloat(oEntry[sDay]) || 0;

        //     sap.m.MessageBox.confirm(
        //         "Delete " + fCurrentHours.toFixed(2) + " hours for " +
        //         this._capitalize(sDay) + "?\n\nProject: " + oEntry.projectName +
        //         "\nWork Type: " + oEntry.workTypeName,
        //         {
        //             title: "Confirm Deletion",
        //             onClose: function (oAction) {
        //                 if (oAction === sap.m.MessageBox.Action.OK) {
        //                     this._deleteHoursAuto(oEntry, sDay);
        //                 }
        //             }.bind(this)
        //         }
        //     );
        // },

        // _deleteHoursAuto: function (oEntry, sDay) {
        //     let oServiceModel = this.getOwnerComponent().getModel("timesheetServiceV2");
        //     let oModel = this.getView().getModel("timeEntryModel");
        //     let aEntries = oModel.getProperty("/timeEntries") || [];
        //     let that = this;

        //     let iIndex = aEntries.findIndex(entry => entry.id === oEntry.id);
        //     if (iIndex === -1) {
        //         sap.m.MessageBox.error("Entry not found");
        //         return;
        //     }

        //     // 🟡 Set the hours to 0 locally first
        //     aEntries[iIndex][sDay] = 0;
        //     oModel.setProperty("/timeEntries", aEntries);

        //     // 🟢 Prepare backend update
        //     let oWeekDates = oModel.getProperty("/weekDates");
        //     let oDayDate = oWeekDates ? oWeekDates[sDay] : new Date();
        //     let sWorkDateStr = this._formatDateForModel(oDayDate);

        //     let sEmployeeID = "a47ac10b-58cc-4372-a567-0e02b2c3d490";
        //     let sProjectID = oEntry.projectId || oEntry.project_ID;
        //     let sTask = oEntry.workType || oEntry.task;

        //     let sFilter = `employee_ID eq '${sEmployeeID}' and project_ID eq '${sProjectID}' and task eq '${sTask}' and workDate eq datetime'${sWorkDateStr}T00:00:00'`;

        //     sap.ui.core.BusyIndicator.show(0);
        //     oServiceModel.read("/MyTimesheets", {
        //         urlParameters: { $filter: sFilter },
        //         success: function (oData) {
        //             let existing = oData.results?.[0];
        //             if (existing) {
        //                 let oPayload = {
        //                     hoursWorked: 0,
        //                     status: "Draft"
        //                 };

        //                 // PATCH existing entry to set hours = 0
        //                 oServiceModel.remove(`/MyTimesheets(guid'${existing.ID}')`, oPayload, {
        //                     method: "PATCH",
        //                     success: function () {
        //                         sap.ui.core.BusyIndicator.hide();
        //                         sap.m.MessageToast.show(`${that._capitalize(sDay)} hours deleted successfully`);
        //                         that._loadTimeEntriesFromBackend();
        //                     },
        //                     error: function (oError) {
        //                         sap.ui.core.BusyIndicator.hide();
        //                         try {
        //                             let response = JSON.parse(oError.responseText);
        //                             let message = response?.error?.message?.value || "Failed to delete hours";
        //                             sap.m.MessageBox.error(message);
        //                         } catch (err) {
        //                             sap.m.MessageBox.error("Unexpected error during deletion");
        //                         }
        //                         console.error("❌ Delete (zero-update) failed:", oError);
        //                     }
        //                 });
        //             } else {
        //                 sap.ui.core.BusyIndicator.hide();
        //                 sap.m.MessageBox.error("No record found for this day to delete.");
        //             }
        //         },
        //         error: function (err) {
        //             sap.ui.core.BusyIndicator.hide();
        //             console.error("❌ Error checking existing entry:", err);
        //             sap.m.MessageBox.error("Failed to verify existing entries before deletion.");
        //         }
        //     });
        // },


        // working
        // _saveEditedDayHoursAuto: function (oEntry, sDay, fNewHours, sTaskDetails) {
        //     let oModel = this.getView().getModel("timeEntryModel");
        //     let oServiceModel = this.getOwnerComponent().getModel("timesheetServiceV2");
        //     let aEntries = oModel.getProperty("/timeEntries") || [];

        //     let that = this;
        //     let iIndex = aEntries.findIndex(entry => entry.id === oEntry.id);

        //     if (iIndex === -1) {
        //         sap.m.MessageBox.error("Entry not found");
        //         return;
        //     }

        //     let previousHours = aEntries[iIndex][sDay];
        //     let previousTask = aEntries[iIndex][sDay + "TaskDetails"];

        //     // Update UI temp
        //     aEntries[iIndex][sDay] = Number(fNewHours) || 0;
        //     aEntries[iIndex][sDay + "TaskDetails"] = sTaskDetails || "";
        //     oModel.setProperty("/timeEntries", aEntries);

        //     let sEmployeeID = oEntry.employee_ID;
        //     let sProjectID = oEntry.projectId || oEntry.project_ID;
        //     let sTask = oEntry.workType || oEntry.task;
        //     let sWorkDateStr = this._formatDateForOData(oEntry[sDay + "Date"]);

        //     // Payload
        //    let oPayload = {
        //   [`${sDay}Hours`]: Number(fNewHours) || 0,
        //   [`${sDay}TaskDetails`]: sTaskDetails || ""
        // };


        //     sap.ui.core.BusyIndicator.show(0);

        //     // ⭐ If backend ID exists → update directly
        //     if (oEntry.id) {
        //         let sPath = `/MyTimesheets(guid'${oEntry.id}')`;

        //         oServiceModel.update(sPath, oPayload, {
        //             method: "PATCH",
        //             success: function () {
        //                 sap.ui.core.BusyIndicator.hide();
        //                 sap.m.MessageToast.show(`${that._capitalize(sDay)} updated successfully`);
        //                 that._loadTimeEntriesFromBackend();
        //             },
        //             error: function () {
        //                 sap.ui.core.BusyIndicator.hide();
        //                 aEntries[iIndex][sDay] = previousHours;
        //                 aEntries[iIndex][sDay + "TaskDetails"] = previousTask;
        //                 oModel.setProperty("/timeEntries", aEntries);
        //                 sap.m.MessageBox.error("Failed to update entry");
        //             }
        //         });

        //         return;
        //     }

        //     // ⭐ If NO backend ID → create new entry
        //     oServiceModel.create("/MyTimesheets", oPayload, {
        //         success: function () {
        //             sap.ui.core.BusyIndicator.hide();
        //             sap.m.MessageToast.show(`${that._capitalize(sDay)} entry created successfully`);
        //             that._loadTimeEntriesFromBackend();
        //         },
        //         error: function () {
        //             sap.ui.core.BusyIndicator.hide();
        //             aEntries[iIndex][sDay] = previousHours;
        //             aEntries[iIndex][sDay + "TaskDetails"] = previousTask;
        //             oModel.setProperty("/timeEntries", aEntries);
        //             sap.m.MessageBox.error("Failed to create entry");
        //         }
        //     });
        // },


        _saveEditedDayHoursAuto: function (oEntry, sDay, fNewHours, sTaskDetails) {
            let oModel = this.getView().getModel("timeEntryModel");
            let oServiceModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            let aEntries = oModel.getProperty("/timeEntries") || [];

            let iIndex = aEntries.findIndex(entry => entry.id === oEntry.id);
            if (iIndex === -1) {
                sap.m.MessageBox.error("Entry not found");
                return;
            }

            function normalizeDate(oDataDate) {
                if (!oDataDate) return null;

                // Handle OData /Date(XXXXXXXXXX)/ format
                if (typeof oDataDate === "string" && oDataDate.startsWith("/Date(")) {
                    let timestamp = parseInt(oDataDate.match(/\/Date\((\d+)\)\//)[1], 10);
                    let d = new Date(timestamp);
                    return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
                }

                if (oDataDate instanceof Date) {
                    return oDataDate.toISOString().split("T")[0];
                }

                return null;
            }

            // Inside your _saveEditedDayHoursAuto function
            let dayDateFieldMap = {
                monday: "monday",
                tuesday: "tuesday",
                wednesday: "wednesday",
                thursday: "thursday",
                friday: "friday",
                saturday: "saturday",
                sunday: "sunday"
            };

            // let dayDateField = dayMap[sDay];
            let selectedDateStr = oEntry.dates ? oEntry.dates[dayDateFieldMap[sDay]] : null;

            // Get previous hours for this cell
            let previousHours = selectedDateStr ? Number(oEntry[sDay + "Hours"] || 0) : 0;



            // // Get the date string of the selected cell
            // let selectedDateStr = oEntry[dayDateField] ? normalizeDate(oEntry[dayDateField]) : null;

            // // Find the previous hours only if this entry’s date matches the selected date
            // let previousHours = (() => {
            //     if (!selectedDateStr) return 0;
            //     return Number(oEntry[sDay + "Hours"] || 0);
            // })();

            let newHours = Number(fNewHours) || 0;

            // ✅ Column-level validation: total hours for this day must not exceed 15
            let currentTotal = aEntries.reduce((sum, entry, idx) => {
                if (idx === iIndex) {
                    // use newHours for the cell being updated
                    return sum + newHours;
                }
                return sum + Number(entry[sDay] || 0);
            }, 0);

            if (currentTotal >= 16) {
                sap.m.MessageBox.error(`Total hours for ${sDay.charAt(0).toUpperCase() + sDay.slice(1)} cannot exceed 15.`);
                return;
            }

            // Get current daily total for this column
            let dailyTotals = oModel.getProperty("/dailyTotals") || {};
            let currentTotalForDay = Number(dailyTotals[sDay] || 0);

            // Calculate the new total if this cell is updated
            let newTotalForDay = currentTotalForDay - previousHours + newHours;

            // Column-level validation: total hours for the day must not exceed 15
            if (newHours >= 15) {
                sap.m.MessageBox.error(`Total hours for ${sDay.charAt(0).toUpperCase() + sDay.slice(1)} cannot exceed 15.`);
                return;
            }
            if (newTotalForDay >= 15) {
                sap.m.MessageBox.error(`Total hours for ${sDay.charAt(0).toUpperCase() + sDay.slice(1)} cannot exceed 15.`);
                return;
            }



            let previousTask = aEntries[iIndex][sDay + "TaskDetails"];
            let diff = newHours - previousHours;

            // 1️⃣ Update UI cell locally
            aEntries[iIndex][sDay] = newHours;
            aEntries[iIndex][sDay + "TaskDetails"] = sTaskDetails || "";
            oModel.setProperty("/timeEntries", aEntries);

            // 2️⃣ Prepare payload for backend
            let oPayload = {
                [`${sDay}Hours`]: newHours,
                [`${sDay}TaskDetails`]: sTaskDetails || ""
            };

            sap.ui.core.BusyIndicator.show(0);
            let sPath = oEntry.id ? `/MyTimesheets(guid'${oEntry.id}')` : "/MyTimesheets";

            let fnSuccess = () => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(`${sDay.charAt(0).toUpperCase() + sDay.slice(1)} saved successfully`);

                // 3️⃣ Update totals immediately
                let dailyTotals = oModel.getProperty("/dailyTotals") || {};
                dailyTotals[sDay] = aEntries.reduce((sum, entry) => sum + Number(entry[sDay] || 0), 0);
                oModel.setProperty("/dailyTotals", dailyTotals);

                let totalWeekHours = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
                oModel.setProperty("/totalWeekHours", totalWeekHours.toFixed(2));

                // 4️⃣ Refresh time entries to show updated hours
                this._loadTimeEntriesFromBackend();
            };

            let fnError = () => {
                sap.ui.core.BusyIndicator.hide();
                // revert changes
                aEntries[iIndex][sDay] = previousHours;
                aEntries[iIndex][sDay + "TaskDetails"] = previousTask;
                oModel.setProperty("/timeEntries", aEntries);

                // revert totals
                let dailyTotals = oModel.getProperty("/dailyTotals") || {};
                dailyTotals[sDay] = aEntries.reduce((sum, entry) => sum + Number(entry[sDay] || 0), 0);
                oModel.setProperty("/dailyTotals", dailyTotals);
                oModel.setProperty("/totalWeekHours", Object.values(dailyTotals).reduce((a, b) => a + b, 0).toFixed(2));

                sap.m.MessageBox.error("Failed to save entry");
            };

            if (oEntry.id) {
                oServiceModel.update(sPath, oPayload, { method: "PATCH", success: fnSuccess, error: fnError });
            } else {
                oServiceModel.create(sPath, oPayload, { success: fnSuccess, error: fnError });
            }
        },


        _capitalize: function (sText) {
            if (!sText || typeof sText !== "string") return "";
            return sText.charAt(0).toUpperCase() + sText.slice(1).toLowerCase();
        },


        onEditDailyHours: function (oEvent) {
            var oButton = oEvent.getSource();
            var sDay = oButton.data("day");
            var oContext = oButton.getBindingContext("timeEntryModel");

            if (!oContext) {
                sap.m.MessageToast.show("Unable to get entry data");
                return;
            }

            var oEntry = oContext.getObject();
            this._currentEditEntry = oEntry;
            this._currentEditDay = sDay;
            var oEntry = this._currentEditEntry;
            var sDay = this._currentEditDay;

            if (!oEntry || !sDay) {
                sap.m.MessageToast.show("Unable to edit. Please try again.");
                return;
            }

            // derive field names
            var sHoursField = sDay + "Hours";
            var sTaskField = sDay + "TaskDetails";
            var sDateField = sDay + "Date";

            // safely read values
            var fCurrentHours = Number(oEntry[sHoursField]) || 0;
            var sCurrentTask = oEntry[sTaskField] || "";

            // format date ONLY if exists
            var oW = this.getView().getModel("timeEntryModel").getProperty("/weekDates");
            var sDateRaw = oW[sDay]; // actual date, e.g. 2025-11-16T00:00:00

            var sDateValue = "";
            if (sDateRaw) {
                try {
                    var oDate = new Date(sDateRaw);
                    sDateValue = oDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric"
                    });
                    // Result: "Nov 16, 2025"
                } catch (e) {
                    console.warn("⚠ Failed to format date:", sDateRaw, e);
                    sDateValue = "";
                }
            }




            // Dropdown values 0–24
            var aHourOptions = [];
            for (var i = 0; i <= 15; i++) {
                aHourOptions.push(new sap.ui.core.Item({
                    key: i.toString(),
                    text: i + " hour" + (i !== 1 ? "s" : "")
                }));
            }

            // create controls with references
            var oHoursCombo = new sap.m.ComboBox({
                selectedKey: fCurrentHours.toString(),
                items: aHourOptions
            });

            var oTaskArea = new sap.m.TextArea({
                value: sCurrentTask,
                rows: 4,
                placeholder: "Describe work done..."
            });

            var oDialog = new sap.m.Dialog({
                title: "Edit " + this._capitalize(sDay) + " Entry",
                contentWidth: "350px",
                titleAlignment: "Center",
                content: [
                    new sap.m.VBox({
                        items: [
                            // Date Field
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({
                                        text: "Date:",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    new sap.m.Input({
                                        value: sDateValue,
                                        editable: false
                                    })
                                ]
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Project Field
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({
                                        text: "Project:",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    new sap.m.Input({
                                        value: oEntry.projectName,
                                        editable: false
                                    })
                                ]
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Task Type Field
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({
                                        text: "Task Type:",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    new sap.m.Input({
                                        value: oEntry.workType,
                                        editable: false
                                    })
                                ]
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Hours Field
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({
                                        text: "Hours:",
                                        design: "Bold",
                                        required: true
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    oHoursCombo
                                ]
                            }).addStyleClass("sapUiTinyMarginBottom"),

                            // Task Details Field
                            new sap.m.VBox({
                                items: [
                                    new sap.m.Label({
                                        text: "Task Details:",
                                        design: "Bold"
                                    }).addStyleClass("sapUiTinyMarginBottom"),
                                    oTaskArea.setRows(4).setWidth("100%")
                                ]
                            })
                        ]
                    }).addStyleClass("sapUiMediumMarginBeginEnd sapUiSmallMarginTopBottom")
                ],
                beginButton: new sap.m.Button({
                    text: "Save",
                    type: "Emphasized",
                    icon: "sap-icon://save",
                    press: function () {
                        var fNewHours = Number(oHoursCombo.getSelectedKey());
                        var sTaskDetails = oTaskArea.getValue();

                        if (isNaN(fNewHours) || fNewHours < 0 || fNewHours > 24) {
                            sap.m.MessageBox.error("Please select valid hours between 0 and 24");
                            return;
                        }

                        this._saveEditedDayHoursAuto(oEntry, sDay, fNewHours, sTaskDetails);
                        oDialog.close();
                    }.bind(this)
                }),
                endButton: new sap.m.Button({
                    text: "Cancel",
                    icon: "sap-icon://decline",
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

        _validateMandatoryFields: function (entry) {
            if (!entry) {
                sap.m.MessageBox.error("No entry data found.");
                return false;
            }

            // Check project
            if (!entry.projectId || entry.projectId.trim() === "") {
                sap.m.MessageBox.error("Please select a Project.");
                return false;
            }

            // Check work type / task
            // if (!entry.workType || entry.workType.trim() === "") {
            //     sap.m.MessageBox.error("Please select Work Type.");
            //     return false;
            // }

            // Check hours
            let hours = parseFloat(entry.hours);
            if (isNaN(hours) || hours <= 0 || hours > 15) {
                sap.m.MessageBox.error("Hours must be between 0 and 15.");
                return false;
            }

            // Optional: check task details
            if (!entry.taskDetails || entry.taskDetails.trim() === "") {
                sap.m.MessageBox.error("Please enter Task Details.");
                return false;
            }

            // Optional: dailyComments check (if required)
            // if (!entry.dailyComments || Object.keys(entry.dailyComments).length === 0) {
            //     sap.m.MessageBox.error("Please enter daily comments.");
            //     return false;
            // }

            return true; // All validations passed
        },

        _parseODataDate: function (s) {
            if (!s) return null;
            let match = /\/Date\((\d+)\)\//.exec(s);
            return match ? new Date(parseInt(match[1], 10)) : null;
        },

        _loadWeekEntries: function (mondayDate) {
            let oService = this.getOwnerComponent().getModel("timesheetServiceV2");
            let oModel = this.getView().getModel("timeEntryModel");

            let sWeekStart = this._formatDateForModel(mondayDate);
            let sWeekEnd = this._formatDateForModel(new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 6));

            let rawFilter = `weekStartDate eq datetime'${sWeekStart}T00:00:00' and weekEndDate eq datetime'${sWeekEnd}T00:00:00'`;
            console.log("Filter:", rawFilter);

            oService.read("/MyTimesheets", {
                urlParameters: { "$filter": rawFilter },
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    let results = oData.d?.results || oData.results || [];

                    // Filter the response to make sure weekStartDate & weekEndDate match exactly
                    let weekDataFromBackend = results.filter(item => {
                        let itemWeekStart = item.weekStartDate ? new Date(item.weekStartDate).toISOString().split("T")[0] : null;
                        let itemWeekEnd = item.weekEndDate ? new Date(item.weekEndDate).toISOString().split("T")[0] : null;

                        let start = new Date(sWeekStart).toISOString().split("T")[0];
                        let end = new Date(sWeekEnd).toISOString().split("T")[0];

                        return itemWeekStart === start && itemWeekEnd === end;
                    });





                    let weekData;

                    if (weekDataFromBackend.length > 0) {

                        weekData = weekDataFromBackend.map(item => {

                            // If projectName is empty → use nonProjectTypeName instead
                            let finalProjectName = item.projectName
                                ? item.projectName
                                : item.nonProjectTypeName || "";

                            return {
                                id: item.ID,
                                totalWeekHours: item.totalWeekHours,
                                projectId: item.project_ID,
                                projectName: finalProjectName,   // 🔥 THIS IS THE FIX
                                nonProjectType_ID: item.nonProjectType_ID,
                                nonProjectTypeName: item.nonProjectTypeName,
                                workType: item.task || "",
                                status: item.status || "",
                                weekStart: this._parseODataDate(item.weekStartDate),
                                weekEnd: this._parseODataDate(item.weekEndDate),
                                mondayHours: item.mondayHours || 0,
                                tuesdayHours: item.tuesdayHours || 0,
                                wednesdayHours: item.wednesdayHours || 0,
                                thursdayHours: item.thursdayHours || 0,
                                fridayHours: item.fridayHours || 0,
                                saturdayHours: item.saturdayHours || 0,
                                sundayHours: item.sundayHours || 0,
                                mondayTaskDetails: item.mondayTaskDetails || "",
                                tuesdayTaskDetails: item.tuesdayTaskDetails || "",
                                wednesdayTaskDetails: item.wednesdayTaskDetails || "",
                                thursdayTaskDetails: item.thursdayTaskDetails || "",
                                fridayTaskDetails: item.fridayTaskDetails || "",
                                saturdayTaskDetails: item.saturdayTaskDetails || "",
                                sundayTaskDetails: item.sundayTaskDetails || "",
                                dates: oModel.getProperty("/weekDates")
                            };


                        });

                    } else {
                        // No matching week → show nothing
                        weekData = [];
                        oModel.setProperty("/timeEntries", weekData);

                        oModel.setProperty("/dailyTotals", {
                            monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
                            friday: 0, saturday: 0, sunday: 0
                        });
                        oModel.setProperty("/totalWeekHours", 0);

                        let table = this.getView().byId("timesheetTable");
                        table?.getBinding("items")?.refresh(true);
                    }


                    // Apply week data to the table
                    this._applyWeekData(weekData);

                }.bind(this),
                error: function (err) {
                    console.error("Failed to load week entries", err);
                }.bind(this)
            });
        },


        _applyWeekData: function (data) {
            let oModel = this.getView().getModel("timeEntryModel");

            // Set entries
            oModel.setProperty("/timeEntries", data);

            // Calculate daily totals
            let dailyTotals = this._calculateDailyTotals(data);
            oModel.setProperty("/dailyTotals", dailyTotals);

            // Total week hours
            let totalWeekHours = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
            oModel.setProperty("/totalWeekHours", totalWeekHours.toFixed(2));

            // Refresh table
            let table = this.getView().byId("timesheetTable");
            table?.getBinding("items")?.refresh(true);
        },
        _toODataDate: function (dateStr) {
            return `/Date(${new Date(dateStr).getTime()})/`;
        },
        _clearWeekEntries: function () {
            var oModel = this.getView().getModel("timeEntryModel");
            var emptyTotals = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };

            oModel.setProperty("/dailyTotals", emptyTotals);
            oModel.setProperty("/timeEntries", []);
            oModel.setProperty("/totalWeekHours", "0.00");
        },

        _setDatePicker: function (oDate) {
            let oDP = this.byId("datePicker");
            if (oDP && oDate) {
                oDP.setDateValue(oDate);
            }
        },

        onNextWeekTS: function () {
            var oModel = this.getView().getModel("timeEntryModel");
            var monday = new Date(oModel.getProperty("/weekDates/monday"));
            monday.setDate(monday.getDate() + 7);
            oModel.setProperty("/isNextWeek", true);
            this._currentWeekStartDate = monday;
            sap.ui.core.BusyIndicator.show(0)
            this._updateWeekDates(monday);
            this._loadWeekEntries(monday);
            this._setDatePicker(monday);
        },

        onPreviousWeekTS: function () {
            sap.ui.core.BusyIndicator.show(0)
            var oModel = this.getView().getModel("timeEntryModel");
            var monday = new Date(oModel.getProperty("/weekDates/monday"));
            monday.setDate(monday.getDate() - 7);
            oModel.setProperty("/isNextWeek", false);
            this._currentWeekStartDate = monday;
            this._updateWeekDates(monday);
            this._loadWeekEntries(monday);
            this._setDatePicker(monday);
        },

        onCurrentWeekTS: function () {
            sap.ui.core.BusyIndicator.show(0)
            var monday = this._getCurrentWeekMonday();
            this._currentWeekStartDate = monday;
            this._updateWeekDates(monday);
            this._loadWeekEntries(monday);
            this._setDatePicker(monday)
        },


        _updateDailyTotals: function () {
            var oModel = this.getView().getModel("timeEntryModel");
            var aEntries = oModel.getProperty("/timeEntries") || [];
            var totals = {
                monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
                friday: 0, saturday: 0, sunday: 0
            };

            aEntries.forEach(function (entry) {
                totals.monday += entry.monday || 0;
                totals.tuesday += entry.tuesday || 0;
                totals.wednesday += entry.wednesday || 0;
                totals.thursday += entry.thursday || 0;
                totals.friday += entry.friday || 0;
                totals.saturday += entry.saturday || 0;
                totals.sunday += entry.sunday || 0;
            });

            oModel.setProperty("/dailyTotals", totals);
        },
        onDatePickerChange: function (oEvent) {
            sap.ui.core.BusyIndicator.show(0)
            let newDate = oEvent.getSource().getDateValue();
            if (!newDate) return;

            // Compute Monday of the selected week
            let day = newDate.getDay(); // Sunday = 0
            let mondayDate = new Date(newDate);
            mondayDate.setDate(newDate.getDate() - (day === 0 ? 6 : day - 1));
            this._updateWeekDates(mondayDate)
            // Call the existing loadWeekEntries logic
            this._loadWeekEntries(mondayDate);
        },
        _updateWeekDates: function (oDate) {
            var oModel = this.getView().getModel("timeEntryModel");

            var monday = this._getMonday(oDate); // helper to get Monday from any date
            var weekDates = {};
            ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day, i) => {
                let d = new Date(monday);
                d.setDate(d.getDate() + i);
                weekDates[day] = this._formatDateForModel(d);
                weekDates[day + "Formatted"] = this._formatDateDisplay(d);
                weekDates[day + "IsFuture"] = d > new Date();
            });

            oModel.setProperty("/weekDates", weekDates);

            var sCurrentWeek = weekDates.mondayFormatted + " - " + weekDates.sundayFormatted + " " + monday.getFullYear();
            oModel.setProperty("/currentWeek", sCurrentWeek);

            var today = new Date();
            oModel.setProperty("/isCurrentWeek", today >= monday && today <= new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000));
        },
        _getMonday: function (oDate) {
            var day = oDate.getDay();
            var diff = oDate.getDate() - day + (day === 0 ? -6 : 1);
            var monday = new Date(oDate);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);
            return monday;
        },

        _formatDateDisplay: function (oDate) {
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[oDate.getMonth()] + " " + ("0" + oDate.getDate()).slice(-2);
        },




        onTaskDetailPress: function (oEvent) {
            try {
                var oButton = oEvent.getSource();
                var oBindingContext = oButton.getBindingContext("timeEntryModel");

                if (!oBindingContext) {
                    sap.m.MessageToast.show("Unable to get binding context");
                    return;
                }

                var oEntry = oBindingContext.getObject();
                var oModel = this.getView().getModel("timeEntryModel");
                var oWeekDates = oModel.getProperty("/weekDates");

                if (!oWeekDates) {
                    sap.m.MessageToast.show("Week dates not available");
                    return;
                }

                // Ensure dailyComments exists
                oEntry.dailyComments = oEntry.dailyComments || {};

                var that = this; // if needed inside controller

                var aDays = [
                    { name: "Monday", hours: oEntry.mondayHours || 0, comment: oEntry.mondayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.monday) },
                    { name: "Tuesday", hours: oEntry.tuesdayHours || 0, comment: oEntry.tuesdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.tuesday) },
                    { name: "Wednesday", hours: oEntry.wednesdayHours || 0, comment: oEntry.wednesdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.wednesday) },
                    { name: "Thursday", hours: oEntry.thursdayHours || 0, comment: oEntry.thursdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.thursday) },
                    { name: "Friday", hours: oEntry.fridayHours || 0, comment: oEntry.fridayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.friday) },
                    { name: "Saturday", hours: oEntry.saturdayHours || 0, comment: oEntry.saturdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.saturday) },
                    { name: "Sunday", hours: oEntry.sundayHours || 0, comment: oEntry.sundayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.sunday) }
                ];



                var getHoursColorClass = function (hours) {
                    if (hours === 0) {
                        return "tsHoursRed";      // red
                    } else if (hours > 0 && hours < 8) {
                        return "tsHoursOrange";   // orange
                    } else if (hours >= 8 && hours <= 15) {
                        return "tsHoursGreen";    // green
                    }
                    return ""; // default no class
                };

                var aItems = aDays.map(function (oDay, index) {
                    return new sap.m.VBox({
                        width: "100%",
                        items: [
                            new sap.m.HBox({
                                justifyContent: "SpaceBetween",
                                items: [
                                    new sap.m.Text({
                                        text: `${oDay.name} (${oDay.date})`,
                                        design: "Bold"
                                    }),
                                    new sap.m.Text({
                                        text: `${oDay.hours} hrs`,
                                        design: "Bold"
                                    })
                                        .addStyleClass(getHoursColorClass(oDay.hours))
                                ]
                            }).addStyleClass("tsDayHeader"),

                            new sap.m.Text({
                                text: oDay.comment,
                                wrapping: true
                            }).addStyleClass("tsDayComment"),

                            ...(index < aDays.length - 1 ? [
                                new sap.m.ToolbarSeparator().addStyleClass("tsSeparator")
                            ] : [])
                        ]
                    }).addStyleClass("tsDayCard");
                });




                var oDialog = new sap.m.Dialog({
                    title: "Week Task Details",
                    contentWidth: "300px",  // fixed width
                    contentHeight: "70vh",  // max height of dialog
                    stretchOnPhone: true,
                    content: new sap.m.VBox({ items: aItems }),
                    endButton: new sap.m.Button({
                        text: "Close",
                        press: function () { oDialog.close(); }
                    }),
                    afterClose: function () { oDialog.destroy(); }
                });

                this.getView().addDependent(oDialog);
                oDialog.open();

            } catch (oError) {
                console.error("Error in onTaskDetailPress:", oError);
            }
        },


        onProjectSelect: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (oSelectedItem) {
                var oProject = oSelectedItem.getBindingContext().getObject();
                MessageToast.show("Selected project: " + oProject.projectName + " (Manager: " + oProject.managerName + ")");
            }
        },


        onProfilePress: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var oView = this.getView();

            if (!oDataModel) {
                sap.m.MessageBox.error("OData model not found. Please check your manifest configuration.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            oDataModel.read("/MyProfile", {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();

                    // Check if we have results array
                    if (!oData || !oData.results || !oData.results.length) {
                        sap.m.MessageBox.warning("No profile data found.");
                        return;
                    }

                    // Take the first element from results
                    var oRawProfile = oData.results[0];

                    // Map fields for fragment
                    var oProfile = {
                        employeeID: oRawProfile.employeeID || "",
                        firstName: oRawProfile.firstName || "",
                        lastName: oRawProfile.lastName || "",
                        email: oRawProfile.email || "",
                        managerName: oRawProfile.managerName || "",
                        managerEmail: oRawProfile.managerEmail || "",
                        activeStatus: oRawProfile.isActive ? "Yes" : "No",
                        changedBy: oRawProfile.modifiedBy || "",
                        userRole: oRawProfile.userRole && oRawProfile.userRole.__deferred ? "N/A" : (oRawProfile.userRole || "")
                    };

                    // Create JSONModel for fragment
                    var oProfileModel = new sap.ui.model.json.JSONModel({ profile: oProfile });

                    // Load fragment if not already loaded
                    if (!this._oProfileDialog) {
                        this._oProfileDialog = sap.ui.xmlfragment(
                            "employee.Fragments.ProfileDialog",
                            this
                        );
                        oView.addDependent(this._oProfileDialog);
                    }

                    // Set model to fragment
                    this._oProfileDialog.setModel(oProfileModel, "view");

                    // Optional: set employee name in header
                    var oEmployeeNameText = oView.byId("employeeNameText");
                    if (oEmployeeNameText) {
                        oEmployeeNameText.setText(oProfile.firstName + " " + oProfile.lastName);
                    }

                    // Open fragment dialog
                    this._oProfileDialog.open();

                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to load profile data.");
                    console.error(oError);
                }
            });
        },
        onCloseProfileDialog: function () {
            if (this._oProfileDialog) {
                this._oProfileDialog.close();
            }
        },

        onInfoPress: function () {
            var oView = this.getView();

            // Check if dialog already exists
            if (!this._oCommentOptionsDialog) {
                // Create dialog instance from fragment
                this._oCommentOptionsDialog = sap.ui.xmlfragment(
                    oView.getId(),                    // optional ID prefix
                    "employee.Fragments.CommentOptions", // fragment path
                    this                               // controller as event handler
                );

                // Add fragment as dependent to view
                oView.addDependent(this._oCommentOptionsDialog);
            }

            // Initialize comment data every time before opening
            this._initializeCommentData();

            // Open dialog
            this._oCommentOptionsDialog.open();
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

        onSettingsPress: function () {
            MessageBox.information("Timesheet Settings:\n\n- Working hours: 8 hours/day\n- Future bookings allowed for Leave/Training only\n- Manager notifications for approved entry changes");
        },

        onViewReports: function () {
            var oDataModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var oView = this.getView();

            if (!oDataModel) {
                sap.m.MessageBox.error("OData model not found. Please check your manifest configuration.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            oDataModel.read("/MyProgressSummary", {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();

                    if (!oData || !oData.results || !oData.results.length) {
                        sap.m.MessageBox.warning("No profile data found.");
                        return;
                    }

                    // Take the first element from results
                    var aResults = oData.results;

                    // Group data by projectID
                    var oProjects = {};
                    aResults.forEach(function (oEntry) {
                        if (!oProjects[oEntry.projectID]) {
                            oProjects[oEntry.projectID] = {
                                projectName: oEntry.projectName,
                                managerName: "N/A", // you can map from another source if available
                                totalHours: 0,
                                startDate: oEntry.startDate,
                                endDate: oEntry.endDate,
                                status: oEntry.status
                            };
                        }
                        // Sum up hoursWorked
                        oProjects[oEntry.projectID].totalHours += parseFloat(oEntry.hoursWorked || 0);
                        // Optionally, update status if you want the latest or worst status
                        oProjects[oEntry.projectID].status = oEntry.status;
                    });

                    // Build report string
                    var sReport = "Progress Reports:\n\n";
                    Object.values(oProjects).forEach(function (oProject) {
                        sReport += "Project: " + oProject.projectName + "\n";
                        sReport += "Total Hours Worked: " + oProject.totalHours + "\n";
                        sReport += "Start Date: " + this._formatODataDate(oProject.startDate) + "\n";
                        sReport += "End Date: " + this._formatODataDate(oProject.endDate) + "\n";
                        sReport += "Status: " + oProject.status + "\n\n";
                    }.bind(this));

                    // Show MessageBox
                    sap.m.MessageBox.information(sReport, { title: "Project Progress Summary" });

                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to load progress summary.");
                    console.error(oError);
                }
            });
        },

        // Helper function to format OData /Date(…) format to dd-mm-yyyy
        _formatODataDate: function (oDate) {
            if (!oDate) return "";

            // If it's a string in /Date(…)/ format, convert
            if (typeof oDate === "string" && oDate.indexOf("/Date(") === 0) {
                var iTime = parseInt(oDate.replace(/\/Date\((\d+)\)\//, "$1"), 10);
                oDate = new Date(iTime);
            }

            // If it's already a Date object, just format
            if (oDate instanceof Date) {
                var sDay = ("0" + oDate.getDate()).slice(-2);
                var sMonth = ("0" + (oDate.getMonth() + 1)).slice(-2);
                var sYear = oDate.getFullYear();
                return sDay + "-" + sMonth + "-" + sYear;
            }

            return "";
        }






    });
});





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
