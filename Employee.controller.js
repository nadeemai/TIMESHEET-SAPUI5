UPDATED CODE 6

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
                allowedLeaveHours: [],
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


            // Load projects
            var oProjectModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            oProjectModel.read("/MyProjects", {
                success: function (oData) {
                    var results = oData.d ? oData.d.results : oData.results;
                    var mappedProjects = results.map(function (item) {
                        return {
                            projectName: item.projectName,
                            status: item.status,
                            managerName: item.projectOwnerName
                        };
                    });

                    var oJSONModel = new sap.ui.model.json.JSONModel();
                    oJSONModel.setData({ assignedProjects: mappedProjects });
                    oView.setModel(oJSONModel, "assignedProjects");
                }.bind(this),
                error: function (err) {
                    console.error("Failed to load projects", err);
                }
            });

            this._loadReportData(oProjectModel, oView);

        },

formatHoursState: function(hours) {
    if (!hours) return "None";
    
    var hoursNum = parseFloat(hours);
    
    if (hoursNum >= 40) {
        return "Information"; // Blue color for 40+ hours
    } else if (hoursNum >= 8) {
        return "Success"; // Green color for 8-39.99 hours
    } else {
        return "Error"; // Red color for less than 8 hours
    }
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
        onRefreshAnalytics: function () {
            console.log("Refreshing Reports…");

            var oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
            var oView = this.getView();

            sap.ui.core.BusyIndicator.show();

            this._loadReportData(oModel, oView);

            setTimeout(() => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Report data updated ✨");
            }, 1000);
        },

        onTabSelect: function (oEvent) {
            var selectedKey = oEvent.getParameter("key");

            if (selectedKey === "reportsTab") {
                console.log("Reports tab activated → refreshing data");

                var oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
                var oView = this.getView();

                sap.ui.core.BusyIndicator.show();

                this._loadReportData(oModel, oView);

                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 800);
            }
        },

        _getCurrentWeekRange: function () {
    let today = new Date();
    let day = today.getDay();

    // Monday = 1, Sunday = 0 → convert Sunday to 7
    day = day === 0 ? 7 : day;

    // Monday date
    let monday = new Date(today);
    monday.setDate(today.getDate() - (day - 1));

    // Sunday date
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        weekStart: monday.toISOString().split("T")[0], // yyyy-mm-dd
        weekEnd: sunday.toISOString().split("T")[0]
    };
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

    // Project Engagement Duration
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

    let week = this._getCurrentWeekRange();

    oModel.read("/ApprovalFlow", {
        success: function (oData) {
            let entries = oData.results || [];

            // Function to normalize date to YYYY-MM-DD format
            function normalizeDate(dateValue) {
                if (!dateValue) return null;
                
                // If it's already in YYYY-MM-DD format
                if (typeof dateValue === "string" && dateValue.includes("-")) {
                    return dateValue.split("T")[0]; // Remove time part if exists
                }
                
                // If it's a Date object
                if (dateValue instanceof Date) {
                    return dateValue.toISOString().split("T")[0];
                }
                
                // If it's in /Date(...) format
                if (typeof dateValue === "string" && dateValue.includes("/Date(")) {
                    const timestamp = parseInt(dateValue.match(/\/Date\((\d+)\)\//)[1], 10);
                    return new Date(timestamp).toISOString().split("T")[0];
                }
                
                // Default case
                return new Date(dateValue).toISOString().split("T")[0];
            }

            // Normalize dates for all entries
            entries = entries.map(e => ({
                ...e,
                weekStartDateFormatted: normalizeDate(e.weekStartDate),
                weekEndDateFormatted: normalizeDate(e.weekEndDate)
            }));

            // Filter only current week
            let currentWeekEntries = entries.filter(e =>
                e.weekStartDateFormatted === week.weekStart &&
                e.weekEndDateFormatted === week.weekEnd
            );

            // Create the model with properly formatted dates
            var oEntryJSONModel = new sap.ui.model.json.JSONModel({
                employeeTotalEntry: entries.map(entry => ({
                    ...entry,
                    weekStartDate: entry.weekStartDateFormatted,
                    weekEndDate: entry.weekEndDateFormatted
                }))
            });

            oView.setModel(oEntryJSONModel, "entryModel");
        },
        error: function (err) {
            console.error("Failed to load Approval Flow", err);
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

        _checkRowDeleteEligibility: function (row) {
            return (
                (parseFloat(row.mondayHours) || 0) === 0 &&
                (parseFloat(row.tuesdayHours) || 0) === 0 &&
                (parseFloat(row.wednesdayHours) || 0) === 0 &&
                (parseFloat(row.thursdayHours) || 0) === 0 &&
                (parseFloat(row.fridayHours) || 0) === 0 &&
                (parseFloat(row.saturdayHours) || 0) === 0 &&
                (parseFloat(row.sundayHours) || 0) === 0
            );
        },

    _parseAnyDate: function (str) {
    if (!str) return null;

    str = String(str).trim();

    // Case 1 → ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        let [yyyy, mm, dd] = str.split("T")[0].split("-").map(Number);
        return new Date(yyyy, mm - 1, dd);
    }

    // Case 2 → WorkZone MM/DD/YY
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
        let [mm, dd, yy] = str.split("/").map(Number);
        return new Date(2000 + yy, mm - 1, dd); // always 20xx
    }

    // Case 3 → MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        let [mm, dd, yyyy] = str.split("/").map(Number);
        return new Date(yyyy, mm - 1, dd);
    }

    // Case 4 → DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        let [dd, mm, yyyy] = str.split("/").map(Number);
        return new Date(yyyy, mm - 1, dd);
    }

    // fallback
    let d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
},


_calculateWeek: function (date) {
    if (!(date instanceof Date) || isNaN(date)) return null;

    let d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let day = d.getDay(); // 0 = Sun, 1 = Mon

    // If Sunday → go back 6 days; else → back to Monday
    let diffToMonday = (day === 0 ? -6 : 1 - day);

    // Monday
    let monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    // Sunday
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { weekStart: monday, weekEnd: sunday };
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

            let selectedDateStr = oModel.getProperty("/selectedDate");

            if (!selectedDateStr) {
                // fallback only on very first load
                let monday = this._getCurrentWeekMonday();
                selectedDateStr = monday.toISOString().split("T")[0];
            }


            this._fetchWeekBoundaries(selectedDateStr)
                .then(week => {

                     let backendStart = new Date(week.getWeekBoundaries.weekStart);
    let backendEnd = new Date(week.getWeekBoundaries.weekEnd);

    

    // Convert selected date properly first:
    let sel = this._parseAnyDate(selectedDateStr);   // we'll add function below

    // Calculate correct Monday → Sunday for selected date
    let calc = this._calculateWeek(sel);

    let calcStart = calc.weekStart;
    let calcEnd = calc.weekEnd;

  
    let useBackend =
        sel >= backendStart &&
        sel <= backendEnd;

    let finalStart = useBackend ? backendStart : calcStart;
    let finalEnd   = useBackend ? backendEnd   : calcEnd;

    console.log("🏁 FINAL Week Start:", finalStart);
    console.log("🏁 FINAL Week End:", finalEnd);

    // Now update UI using FINAL weekStart
    this._updateWeekDates(finalStart);

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


                            let toDate = d => new Date(d); // convert "2025-11-17" to full Date object
function normalizeToLocalMidnight(d) {
    if (!(d instanceof Date)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

                            let filtered = allResults.filter(item => {
                               let itemStart = item.weekStartDate 
    ? normalizeToLocalMidnight(new Date(item.weekStartDate)) 
    : null;

let itemEnd = item.weekEndDate 
    ? normalizeToLocalMidnight(new Date(item.weekEndDate)) 
    : null;

let fs = normalizeToLocalMidnight(finalStart);
let fe = normalizeToLocalMidnight(finalEnd);


                              return itemStart?.getTime() === fs.getTime() &&
       itemEnd?.getTime() === fe.getTime();

                            });





                            let formatted = filtered.map(item => {

                                const isLeaveEntry =
    (item.nonProjectTypeName && item.nonProjectTypeName.toLowerCase().includes("leave")) ||
    (item.task && item.task.toLowerCase().includes("leave"));

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

                                    dates: weekDates,

                                    // UI logic for leave button color
mondayIsLeave: isLeaveEntry && Number(item.mondayHours) > 0,
tuesdayIsLeave: isLeaveEntry && Number(item.tuesdayHours) > 0,
wednesdayIsLeave: isLeaveEntry && Number(item.wednesdayHours) > 0,
thursdayIsLeave: isLeaveEntry && Number(item.thursdayHours) > 0,
fridayIsLeave: isLeaveEntry && Number(item.fridayHours) > 0,

// weekends cannot have leave → always false
saturdayIsLeave: false,
sundayIsLeave: false,


                                };
                            });


                            formatted.forEach(row => {
                                row.canDelete = this._checkRowDeleteEligibility(row);
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


      _isFutureDate: function (selectedDateStr, weekStartStr, weekEndStr) {

    // --- convert date string into Date object ---
    function parseFlexibleDate(str) {
    if (!str) return null;

    // If already a Date
    if (str instanceof Date) {
        const d = new Date(str.getFullYear(), str.getMonth(), str.getDate());
        d.setHours(0,0,0,0);
        return d;
    }

    // If UI5 may pass object like { value: "2026-01-19" }
    if (typeof str === "object") {
        str = str.value || str.date || null;
        if (!str) return null;
    }

    if (typeof str !== "string") return null;
    str = str.trim();

    // 1) ISO YYYY-MM-DD or ISO datetime
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const clean = str.split("T")[0];
        const [yyyy, mm, dd] = clean.split("-").map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        d.setHours(0,0,0,0);
        return isNaN(d.getTime()) ? null : d;
    }

    // 2) DD/MM/YYYY (unambiguous)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [dd, mm, yyyy] = str.split("/").map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        d.setHours(0,0,0,0);
        return isNaN(d.getTime()) ? null : d;
    }

    // 3) Short form with two-digit year: M/D/YY or D/M/YY (ambiguous)
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
        let [p1, p2, yy] = str.split("/").map(Number);
        const yyyy = 2000 + yy;

        // If first part > 12 -> first is day (DD/MM/YY)
        if (p1 > 12 && p2 <= 12) {
            const d = new Date(yyyy, p2 - 1, p1);
            d.setHours(0,0,0,0);
            return isNaN(d.getTime()) ? null : d;
        }

        // If second part > 12 -> second is day -> MM/DD/YY (Workzone style)
        if (p2 > 12 && p1 <= 12) {
            const d = new Date(yyyy, p1 - 1, p2);
            d.setHours(0,0,0,0);
            return isNaN(d.getTime()) ? null : d;
        }

        // Both <= 12 -> treat as MM/DD/YY (Workzone) — safer for your deployment
        const d = new Date(yyyy, p1 - 1, p2);
        d.setHours(0,0,0,0);
        return isNaN(d.getTime()) ? null : d;
    }

    // 4) Fallback to Date parse (rare)
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    d.setHours(0,0,0,0);
    return d;
}


    let selectedDate = parseFlexibleDate(selectedDateStr);
    let today = new Date();

    // Normalize time to 00:00 to avoid time-zone issues
    selectedDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    // Parse weekStart/weekEnd (ISO)
    let ws = new Date(weekStartStr);
    let we = new Date(weekEndStr);
    ws.setHours(0,0,0,0);
    we.setHours(0,0,0,0);

    // --- Year comparison ---
    if (selectedDate.getFullYear() > today.getFullYear()) return true;
    if (selectedDate.getFullYear() < today.getFullYear()) return false;

    // --- Month comparison ---
    if (selectedDate.getMonth() > today.getMonth()) return true;
    if (selectedDate.getMonth() < today.getMonth()) return false;

    // --- SAME YEAR + SAME MONTH ---

    // if selected date is > today → FUTURE (even inside current week)
    if (selectedDate > today) return true;

    // if inside same week and <= today → NOT future
    if (selectedDate >= ws && selectedDate <= we) return false;

    //  same month but outside week → future
    return true;
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

    let weekInfo = that._getCurrentWeekDates();
    let isFuture = that._isFutureDate(value, weekInfo.weekStart, weekInfo.weekEnd);
    let isInsideCurrentWeek = that._isDateInsideWeek(value, weekInfo.weekStart, weekInfo.weekEnd);
    let isPastBeforeWeek = this._isPastBeforeWeek(value, weekInfo.weekStart);

    function getWeekdayFromDate(dateStr) {
    function parseFlexibleDate(str) {
        if (!str) return null;

        // Already Date object
        if (str instanceof Date) return new Date(str.getFullYear(), str.getMonth(), str.getDate());

        // Trim and normalize
        str = String(str).trim();

        // ISO YYYY-MM-DD (safe)
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            const [yyyy, mm, dd] = str.split("T")[0].split("-").map(Number);
            return new Date(yyyy, mm - 1, dd);
        }

        // Slash formats
        if (str.includes("/")) {
            const parts = str.split("/").map(s => s.trim());
            if (parts.length !== 3) return new Date(str);

            const [p1, p2, p3] = parts;
            const n1 = Number(p1), n2 = Number(p2);
            const yearPart = p3;

            // If year is 4 digits → assume DD/MM/YYYY (India)
            if (/^\d{4}$/.test(yearPart)) {
                const yyyy = Number(yearPart);
                const dd = n1;
                const mm = n2;
                return new Date(yyyy, mm - 1, dd);
            }

            // If year is 2 digits → Workzone style likely MM/DD/YY,
            // but if first part > 12 then it's DD/MM/YY
            if (/^\d{2}$/.test(yearPart)) {
                const yyyy = 2000 + Number(yearPart);
                if (n1 > 12) {
                    // DD/MM/YY
                    return new Date(yyyy, n2 - 1, n1);
                } else {
                    // MM/DD/YY (assume Workzone)
                    return new Date(yyyy, n1 - 1, n2);
                }
            }

            // Fallback: try to interpret as DD/MM/YYYY if ambiguous
            // (most likely for your users)
            const yyyy = Number(yearPart.length === 2 ? "20" + yearPart : yearPart);
            return new Date(yyyy, n2 - 1, n1);
        }

        // Fallback to Date parsing
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    const d = parseFlexibleDate(dateStr);
    if (!d || isNaN(d.getTime())) return null;

    const days = [
        "sunday", "monday", "tuesday", "wednesday",
        "thursday", "friday", "saturday"
    ];
    return days[d.getDay()];
}

    let selectedDay = getWeekdayFromDate(value);
    let isWeekend = (selectedDay === "saturday" || selectedDay === "sunday");

    let allowedNonProjects = allNonProjects.filter(np => !np.isLeave);
    let projectsToShow = [];

    if (isPastBeforeWeek) {
    projectsToShow = [
        ...allProjects,
        ...allNonProjects        
    ];

    oModel.setProperty("/projectsToShow", projectsToShow);
    oModel.setProperty("/tasksToShow", []);
    oModel.setProperty("/isTaskDisabled", true);
    return;
}


if (isInsideCurrentWeek) {

    if (!isWeekend) {
        // Weekday inside current week → show everything
        projectsToShow = [...allProjects, ...allNonProjects];
    } else {
        // Weekend inside current week → exclude leave
        projectsToShow = [
            ...allProjects,
            ...allowedNonProjects
        ];
    }
}
else {
    if (!isWeekend) {
        // Weekday future outside → only non-projects + leave
        projectsToShow = [...allNonProjects];
    } else {
        // Weekend future outside → only non-projects without leave
        projectsToShow = [...allowedNonProjects];
    }
}

oModel.setProperty("/projectsToShow", projectsToShow);
oModel.setProperty("/tasksToShow", []);
oModel.setProperty("/isTaskDisabled", true);


});



        },
        _isPastBeforeWeek: function (dateStr, weekStart) {
    const normalize = (d) => {
        const nd = new Date(d);
        nd.setHours(0, 0, 0, 0);
        return nd;
    };

    const selected = normalize(dateStr);
    const start = normalize(weekStart);

    return selected < start;  
},

   _isDateInsideWeek: function(dateStr, weekStart, weekEnd) {

    const normalize = (d) => {
        if (!d) return null;
        const nd = new Date(d);
        nd.setHours(0, 0, 0, 0);
        return nd;
    };

    const selected = normalize(dateStr);
    const start = normalize(weekStart);
    const end = normalize(weekEnd);

    if (!selected || !start || !end) return false;

    return selected >= start && selected <= end;
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

            let defaultHours = [];
for (let i = 1; i <= 15; i++) {
    defaultHours.push({ key: String(i), text: String(i) });
}
oModel.setProperty("/allowedLeaveHours", defaultHours);


            // Initialize newEntry with empty/default values
            oModel.setProperty("/newEntry", {
                selectedDate: selectedDateStr,
                projectId: "",              
                projectName: "",            
                nonProjectTypeID: "",       
                nonProjectTypeName: "",     
                workType: "",
                leaveType: "",
                leaveTypeName: "",
                hours: "",
                taskDetails: "",
                dailyComments: {},
                isHoursEditable: false,
                isLeaveSelected: false
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

            var loadLeaveTypes = new Promise(function (resolve) {
    oServiceModel.read("/AvailableLeaveTypes", {
        success: function (oData) {
            var aLeaves = oData.results.map(l => ({
                id: l.ID,
                name: l.typeName
            }));
            oModel.setProperty("/leaveTypes", aLeaves);
            resolve();
        },
        error: function () {
            oModel.setProperty("/leaveTypes", []);
            resolve();
        }
    });
});


            // Open dialog after all promises
         Promise.all([loadProjects, loadNonProjects, loadTasks, loadLeaveTypes]).then(function () {

    var startWeekDate = that._currentWeekStartDate || new Date(); // Monday of displayed week
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    startWeekDate.setHours(0, 0, 0, 0);

    // Selected DATE for Add Entry (day inside the week)
    var selectedDateStr = oModel.getProperty("/newEntry/selectedDate");
    var selectedDate = new Date(selectedDateStr);
    selectedDate.setHours(0, 0, 0, 0);

    var dayIndex = selectedDate.getDay(); // 0 Sun - 6 Sat
    var isWeekend = (dayIndex === 6 || dayIndex === 0); // Sat/Sun
    var isFutureWeek = startWeekDate > today;

    var allProjects = oModel.getProperty("/projects") || [];
    var allNonProjects = oModel.getProperty("/nonProjects") || [];


    if (isFutureWeek || isWeekend) {
       
        var projectsToShow = allNonProjects.map(np => ({
            id: np.nonProjectTypeID,
            name: np.nonProjectTypeName,
            isNonProject: true
        }));

        oModel.setProperty("/projectsToShow", projectsToShow);
        oModel.setProperty("/tasksToShow", []);          // disable task dropdown
        oModel.setProperty("/isTaskDisabled", true);
    } else {
        var projectsToShow = [
            ...allProjects.map(p => ({
                id: p.projectId,
                name: p.projectName,
                isNonProject: false
            })),
            ...allNonProjects.map(np => ({
                id: np.nonProjectTypeID,
                name: np.nonProjectTypeName,
                isNonProject: true
            }))
        ];

        oModel.setProperty("/projectsToShow", projectsToShow);
        oModel.setProperty("/tasksToShow", oModel.getProperty("/workTypes") || []);
        oModel.setProperty("/isTaskDisabled", false);
    }
    if (!that._oAddEntryDialog) {
        that._oAddEntryDialog = sap.ui.xmlfragment(
            that.getView().getId(),
            "employee.Fragments.AddTimeEntry",
            that
        );
        that.getView().addDependent(that._oAddEntryDialog);
    }

    // Reset fragment UI controls
   let p = sap.ui.getCore().byId(that.getView().getId() + "--projectShow");

if (p) p.setSelectedKey("");
oModel.setProperty("/isHoursEditable", true);



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

    const isLeave = text.toLowerCase() === "leave";

    if (isLeave) {
        newEntry.isLeaveSelected = true;
        newEntry.leaveType = "";
        newEntry.workType = "";

        // Disable task
        oModel.setProperty("/tasksToShow", []);
        oModel.setProperty("/isTaskDisabled", true);

        // Hours disabled until user selects leave type
        oModel.setProperty("/newEntry/hours", "");
        oModel.setProperty("/isHoursEditable", false);

        // set leave as non-project
        newEntry.nonProjectTypeID = key;
        newEntry.nonProjectTypeName = text;
        newEntry.projectId = "";
        newEntry.projectName = "";
    }
    else if (selected.isNonProject) {
        newEntry.isLeaveSelected = false;

        newEntry.nonProjectTypeID = key;
        newEntry.nonProjectTypeName = text;

        newEntry.projectId = "";
        newEntry.projectName = "";
        newEntry.workType = "";

        oModel.setProperty("/tasksToShow", []);
        oModel.setProperty("/isTaskDisabled", true);

        // Hours editable
        oModel.setProperty("/isHoursEditable", true);
    }
    else {
        newEntry.isLeaveSelected = false;

        newEntry.projectId = key;
        newEntry.projectName = text;

        newEntry.nonProjectTypeID = "";
        newEntry.nonProjectTypeName = "";
        newEntry.workType = "";

        oModel.setProperty("/tasksToShow", oModel.getProperty("/workTypes") || []);
        oModel.setProperty("/isTaskDisabled", false);

        // Hours editable
        oModel.setProperty("/isHoursEditable", true);
    }

    oModel.setProperty("/newEntry", newEntry);
},


onLeaveTypeChange: function (oEvent) {
    var oModel = this.getView().getModel("timeEntryModel");
    var selectedKey = oEvent.getSource().getSelectedKey();

    var leaveTypes = oModel.getProperty("/leaveTypes") || [];
    var selectedLeave = leaveTypes.find(l => l.id === selectedKey);

    var newEntry = oModel.getProperty("/newEntry") || {};

    if (selectedLeave) {
        newEntry.leaveType = selectedKey;    
        newEntry.leaveTypeName = selectedLeave.name;
    }

    let selName = (selectedLeave?.name || "").toLowerCase();

    if (selName.includes("personal") || selName.includes("sick")) {
        // Full leave types → allow 4 and 8
        oModel.setProperty("/allowedLeaveHours", [
            { key: "4", text: "4 hours" },
            { key: "8", text: "8 hours" }
        ]);

        newEntry.hours = ""; // user must select
        oModel.setProperty("/isHoursEditable", true);
    }
    else if (selName.includes("half")) {
        // Half-day leave → ONLY 4 hours
        oModel.setProperty("/allowedLeaveHours", [
            { key: "4", text: "4 hours" }
        ]);

        newEntry.hours = "";
        oModel.setProperty("/isHoursEditable", true);
    }
    else {
        // Normal non-project → hours 0–15
        let list = [];
        for (let i = 0; i <= 15; i++) {
            list.push({ key: String(i), text: `${i} hours` });
        }

        oModel.setProperty("/allowedLeaveHours", list);
        newEntry.hours = "";
        oModel.setProperty("/isHoursEditable", true);
    }

    oModel.setProperty("/newEntry", newEntry);
},

        onSaveNewEntry: function () {
            sap.ui.core.BusyIndicator.show(0);
            var oModel = this.getView().getModel("timeEntryModel");
            var oNewEntry = oModel.getProperty("/newEntry") || {};
            var that = this;

            if (!this._validateMandatoryFields(oNewEntry)) {
                sap.ui.core.BusyIndicator.hide();
                return false;
            }

            var hoursForDay = parseFloat(oNewEntry.hours) || 0;
            if (hoursForDay <= 0 || hoursForDay > 15) {
                sap.m.MessageBox.error("Hours must be between 0 and 15");
                return false;
            }

            var selectedDateStr = oNewEntry.selectedDate;
            var dayProp = this._dayPropertyFromDate(selectedDateStr);
            var hoursProp = dayProp + "Hours";
            var taskProp = dayProp + "TaskDetails";

            const existingEntries = oModel.getProperty("/timeEntries") || [];
            let isDuplicate = false;

            existingEntries.forEach(e => {
                if (e.workType === oNewEntry.workType &&
                    (e.projectName === oNewEntry.projectName ||
                        e.nonProjectTypeName === oNewEntry.nonProjectTypeName)) {
                    isDuplicate = true;
                }
            });

            if (isDuplicate) {
                sap.m.MessageBox.warning("This entry already exists 👀");
                if (this._oAddEntryDialog) {
                    this._oAddEntryDialog.close();
                    sap.ui.core.BusyIndicator.hide();
                }
                return;
            }

            // Prepare payload
            var newRow = {
                project_ID: null,
                nonProjectType_ID: null,
                projectName: oNewEntry.projectName || "",
                nonProjectTypeName: oNewEntry.nonProjectTypeName,
                nonProjectTypeID: oNewEntry.nonProjectTypeID,
                task: oNewEntry.isLeaveSelected ? "Leave" : oNewEntry.workType,
    leaveType_ID: oNewEntry.isLeaveSelected ? oNewEntry.leaveType : null,
    leaveTypeName: oNewEntry.isLeaveSelected ? oNewEntry.leaveTypeName : null,
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

//  VALIDATION → Prevent multiple leave entries for same day

if (oNewEntry.isLeaveSelected) {

    const timeEntries = oModel.getProperty("/timeEntries") || [];

    const dayProp = this._dayPropertyFromDate(oNewEntry.selectedDate);
    const hoursProp = dayProp + "Hours";

    const alreadyLeave = timeEntries.some(e => {
        let isLeave = e.workType && e.workType.toLowerCase().includes("leave");
        let hasHours = Number(e[hoursProp]) > 0;

        return isLeave && hasHours; // TRUE only if leave entry already exists
    });

    if (alreadyLeave) {
        sap.m.MessageBox.error("Leave already applied for this day.");
        sap.ui.core.BusyIndicator.hide();
        if (that._oAddEntryDialog) that._oAddEntryDialog.close();
        return;
    }
}



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
                    sap.ui.core.BusyIndicator.hide();
                })
                .catch(err => {
                    console.error("❌ Error while creating entry: ", err);
                    // sap.m.MessageBox.error("Failed to save timesheet.");
                });

            return true;
        },



      _resetNewEntryFields: function () {
    let oModel = this.getView().getModel("timeEntryModel");

    oModel.setProperty("/newEntry", {
        selectedDate: oModel.getProperty("/newEntry/selectedDate"), // keep same date
        projectId: "",
        projectName: "",
        nonProjectTypeID: "",
        nonProjectTypeName: "",
        workType: "",
        leaveType: "",
        leaveTypeName: "",
        isLeaveSelected: false,
        isNonProjectSelected: false,
        isBillable: false,
        taskDetails: "",
        hours: "",
        isHoursEditable: false
    });

    // Also reset dropdown states
    oModel.setProperty("/tasksToShow", []);  // hide task dropdown
    oModel.setProperty("/isTaskDisabled", true);
    oModel.setProperty("/isHoursEditable", true); // disable task
},
        onSaveAndNewEntry: function () {
            sap.ui.core.BusyIndicator.show(0);
            var oModel = this.getView().getModel("timeEntryModel");
            var oNewEntry = oModel.getProperty("/newEntry") || {};
            var that = this;

            if (!this._validateMandatoryFields(oNewEntry)) {
                sap.ui.core.BusyIndicator.hide()
                return false;
            }

            // Validate hours
            var hoursForDay = parseFloat(oNewEntry.hours) || 0;
            if (hoursForDay <= 0 || hoursForDay > 15) {
                sap.m.MessageBox.error("Hours must be between 0 and 15");
                sap.ui.core.BusyIndicator.hide()
                return false;
            }

            var selectedDateStr = oNewEntry.selectedDate;
            var dayProp = this._dayPropertyFromDate(selectedDateStr);
            var hoursProp = dayProp + "Hours";
            var taskProp = dayProp + "TaskDetails";
            const existingEntries = oModel.getProperty("/timeEntries") || [];
            let isDuplicate = false;

            existingEntries.forEach(e => {
                if (e.workType === oNewEntry.workType &&
                    (e.projectName === oNewEntry.projectName ||
                        e.nonProjectTypeName === oNewEntry.nonProjectTypeName)) {
                    isDuplicate = true;
                }
            });

            if (isDuplicate) {
                sap.m.MessageBox.warning("This entry already exists 👀");
                if (this._oAddEntryDialog) {
                    this._oAddEntryDialog.close();
                    sap.ui.core.BusyIndicator.hide();
                }
                return;
            }
            // Prepare new row
            var newRow = {
                project_ID: null,
                nonProjectType_ID: null,
                projectName: oNewEntry.projectName || "",
                nonProjectTypeName: oNewEntry.nonProjectTypeName,
                nonProjectTypeID: oNewEntry.nonProjectTypeID,
                   task: oNewEntry.isLeaveSelected ? "Leave" : oNewEntry.workType,
    leaveType_ID: oNewEntry.isLeaveSelected ? oNewEntry.leaveType : null,
    leaveTypeName: oNewEntry.isLeaveSelected ? oNewEntry.leaveTypeName : null,
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

            if (oNewEntry.isLeaveSelected) {

    const timeEntries = oModel.getProperty("/timeEntries") || [];

    const dayProp = this._dayPropertyFromDate(oNewEntry.selectedDate);
    const hoursProp = dayProp + "Hours";

    const alreadyLeave = timeEntries.some(e => {
        let isLeave = e.workType && e.workType.toLowerCase().includes("leave");
        let hasHours = Number(e[hoursProp]) > 0;

        return isLeave && hasHours; // TRUE only if leave entry already exists
    });

    if (alreadyLeave) {
        sap.m.MessageBox.error("Leave already applied for this day.");
        sap.ui.core.BusyIndicator.hide();
        if (that._oAddEntryDialog) that._oAddEntryDialog.close();
        return;
    }
}

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
                    // Instead reset fields for new entry
                    that._resetNewEntryFields();
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Saved! Add another entry.");
                })
                .catch(err => {
                    console.error("❌ Error while saving entry: ", err);
                    if (this._oAddEntryDialog) {
                        this._oAddEntryDialog.close()
                        sap.ui.core.BusyIndicator.hide();
                    }
                    // sap.m.MessageBox.error("Failed to save timesheet.");
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

  
function parseParts(str) {
    if (!str) return null;

    // If already Date
    if (str instanceof Date) {
        return {
            yyyy: str.getFullYear(),
            mm: str.getMonth() + 1,
            dd: str.getDate()
        };
    }

    // UI5 object {value: "..."}
    if (typeof str === "object") str = str.value || str.date;
    if (!str) return null;

    // 1️WorkZone format FIRST → MM/DD/YY
  
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
        let [mm, dd, yy] = str.split("/").map(Number);

        // WorkZone ALWAYS sends MM/DD/YY
        return {
            yyyy: 2000 + yy,
            mm,
            dd
        };
    }


    // 2️ Standard DD/MM/YYYY
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [dd, mm, yyyy] = str.split("/").map(Number);
        return { yyyy, mm, dd };
    }

    
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [yyyy, mm, dd] = str.split("-").map(Number);
        return { yyyy, mm, dd };
    }

    // fallback
    const d = new Date(str);
    return isNaN(d.getTime())
        ? null
        : { yyyy: d.getFullYear(), mm: d.getMonth() + 1, dd: d.getDate() };
}



    // Convert YYYY-MM-DD parts → JS UTC date → V2 /Date(x)/
    function partsToV2(parts) {
        const utc = Date.UTC(parts.yyyy, parts.mm - 1, parts.dd);
        return `/Date(${utc})/`;
    }

    // Compute week boundaries in UTC-safe mode
    function calcWeek(parts) {
        let d = new Date(Date.UTC(parts.yyyy, parts.mm - 1, parts.dd));
        let day = d.getUTCDay(); // 0 = Sun ... 1 = Mon
        let diffToMonday = (day === 0 ? -6 : 1 - day);

        let ws = new Date(d);
        ws.setUTCDate(d.getUTCDate() + diffToMonday);

        let we = new Date(ws);
        we.setUTCDate(ws.getUTCDate() + 6);

        return {
            weekStart: { yyyy: ws.getUTCFullYear(), mm: ws.getUTCMonth() + 1, dd: ws.getUTCDate() },
            weekEnd: { yyyy: we.getUTCFullYear(), mm: we.getUTCMonth() + 1, dd: we.getUTCDate() }
        };
    }


    const selParts = parseParts(selectedDateStr);
    const selUTC = Date.UTC(selParts.yyyy, selParts.mm - 1, selParts.dd);

    const backendStartParts = parseParts(weekData.getWeekBoundaries.weekStart);
    const backendEndParts = parseParts(weekData.getWeekBoundaries.weekEnd);

    const backendStartUTC = Date.UTC(backendStartParts.yyyy, backendStartParts.mm - 1, backendStartParts.dd);
    const backendEndUTC = Date.UTC(backendEndParts.yyyy, backendEndParts.mm - 1, backendEndParts.dd);

    let useBackend =
        selUTC >= backendStartUTC &&
        selUTC <= backendEndUTC;

    let finalStartParts, finalEndParts;

    if (useBackend) {
        console.warn("➡ Using BACKEND week boundaries");
        finalStartParts = backendStartParts;
        finalEndParts = backendEndParts;
    } else {
        console.warn("➡ Calculating NEW week boundaries");
        const range = calcWeek(selParts);
        finalStartParts = range.weekStart;
        finalEndParts = range.weekEnd;
    }

    const weekStartV2 = partsToV2(finalStartParts);
    const weekEndV2 = partsToV2(finalEndParts);

    console.log("FINAL WeekStart V2:", weekStartV2);
    console.log("FINAL WeekEnd   V2:", weekEndV2);




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

    // --- CREATE PAYLOAD ---
    var payloadFull = {
        employee_ID: employeeID,
        weekStartDate: weekStartV2,
        weekEndDate: weekEndV2,
        project_ID: entry.project_ID || null,
        projectName: entry.projectName,
        nonProjectType_ID: entry.nonProjectTypeID,
        nonProjectTypeName: entry.nonProjectTypeName,
         task: oNewEntry.isLeaveSelected ? "Leave" : oNewEntry.workType,
    leaveType_ID: oNewEntry.isLeaveSelected ? oNewEntry.leaveType : null,
    leaveTypeName: oNewEntry.isLeaveSelected ? oNewEntry.leaveTypeName : null,
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

                   function normalizeAnyDate(input) {
    if (!input) return null;

    // CASE 1 → JS Date object
    if (input instanceof Date && !isNaN(input)) {
        return input.toISOString().split("T")[0]; // yyyy-mm-dd
    }

    // CASE 2 → V2 format /Date(###)/
    let match = /\/Date\((\-?\d+)/.exec(input);
    if (match) {
        const ms = Number(match[1]);
        return new Date(ms).toISOString().split("T")[0];
    }

    // CASE 3 → ISO 2025-12-04
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return input;
    }

    // CASE 4 → DD/MM/YYYY or MM/DD/YYYY
    if (input.includes("/")) {
        let [a, b, c] = input.split("/");

        // fix year
        if (c.length === 2) c = "20" + c;

        // heuristic:
        // if month > 12 → input is DD/MM/YYYY
        if (Number(a) > 12) {
            return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
        }

        // otherwise assume MM/DD/YYYY (Workzone)
        return `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }

    // fallback
    let d = new Date(input);
    if (!isNaN(d)) {
        return d.toISOString().split("T")[0];
    }

    return null;
}
                 let selectedISO = normalizeAnyDate(selectedDateStr);

let filteredItems = items.filter(i => {
    let storedISO = normalizeAnyDate(i[dayDateField]);
    return storedISO && selectedISO && storedISO === selectedISO;
});

                // ---------------- DAILY LIMIT CHECK ----------------
                let currentTotal = filteredItems.reduce((sum, i) =>
                    sum + (Number(i[dayProp + "Hours"]) || 0), 0
                );

                let newTotal = currentTotal + Number(hours);

                if (newTotal > 15) {
                    sap.m.MessageBox.error(`You can only log 15 hours max on ${selectedDateStr}.`);
                    if (that._oAddEntryDialog) that._oAddEntryDialog.close();
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }

                // ---------------- SAME PROJECT + SAME TASK CHECK ----------------
                function isSameProjectRow(i, entry) {
                    const iProject = i.project_ID || null;
                    const iNonProj = i.nonProjectType_ID || null;

                    const eProject = entry.project_ID || null;
                    const eNonProj = entry.nonProjectTypeID || null;

                    const sameTask =
                        (i.task || "").trim().toLowerCase() === (entry.task || "").trim().toLowerCase();

                    if (iProject && eProject) return sameTask && iProject === eProject;
                    if (iNonProj && eNonProj) return sameTask && iNonProj === eNonProj;
                    return false;
                }

                let exist = filteredItems.find(i => isSameProjectRow(i, entry));

                if (exist) {
                    sap.m.MessageBox.error(
                        "A timesheet entry for this Project + Task + Date already exists.\nDuplicates are not allowed."
                    );
                    if (that._oAddEntryDialog) that._oAddEntryDialog.close();
                    sap.ui.core.BusyIndicator.hide();
                    return; 
                }

                // ---------------- CREATE NEW ROW ----------------
                oModel.create("/MyTimesheets", payloadFull, {
                    success: function (data) {

                        let timeEntryModel = that.getView().getModel("timeEntryModel");

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

                        oModel.setProperty("/projectsToShow", []);
                        oModel.setProperty("/tasksToShow", []);

                        entry[dayProp + "Hours"] = null;
                        entry[dayProp + "TaskDetails"] = "";

                        sap.m.MessageToast.show("Timesheet saved!");
                        resolve(data);
                    },

                    error: function (err) {
                        sap.m.MessageBox.error("Timesheet Already Exists.");
                        sap.ui.core.BusyIndicator.hide();
                        reject(err);
                    }
                });
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
                "mondayHours", "tuesdayHours", "wednesdayHours",
                "thursdayHours", "fridayHours", "saturdayHours", "sundayHours"
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

  function parseParts(str) {
    if (!str) return null;

    // If already Date
    if (str instanceof Date) {
        return {
            yyyy: str.getFullYear(),
            mm: str.getMonth() + 1,
            dd: str.getDate()
        };
    }

    // UI5 object {value: "..."}
    if (typeof str === "object") str = str.value || str.date;
    if (!str) return null;

   
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
        let [mm, dd, yy] = str.split("/").map(Number);

        // WorkZone ALWAYS sends MM/DD/YY
        return {
            yyyy: 2000 + yy,
            mm,
            dd
        };
    }


    //  Standard DD/MM/YYYY
  
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [dd, mm, yyyy] = str.split("/").map(Number);
        return { yyyy, mm, dd };
    }

    //  ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [yyyy, mm, dd] = str.split("-").map(Number);
        return { yyyy, mm, dd };
    }

    // fallback
    const d = new Date(str);
    return isNaN(d.getTime())
        ? null
        : { yyyy: d.getFullYear(), mm: d.getMonth() + 1, dd: d.getDate() };
}



    // Convert YYYY-MM-DD parts → JS UTC date → V2 /Date(x)/
    function partsToV2(parts) {
        const utc = Date.UTC(parts.yyyy, parts.mm - 1, parts.dd);
        return `/Date(${utc})/`;
    }

    // Compute week boundaries in UTC-safe mode
    function calcWeek(parts) {
        let d = new Date(Date.UTC(parts.yyyy, parts.mm - 1, parts.dd));
        let day = d.getUTCDay(); // 0 = Sun ... 1 = Mon
        let diffToMonday = (day === 0 ? -6 : 1 - day);

        let ws = new Date(d);
        ws.setUTCDate(d.getUTCDate() + diffToMonday);

        let we = new Date(ws);
        we.setUTCDate(ws.getUTCDate() + 6);

        return {
            weekStart: { yyyy: ws.getUTCFullYear(), mm: ws.getUTCMonth() + 1, dd: ws.getUTCDate() },
            weekEnd: { yyyy: we.getUTCFullYear(), mm: we.getUTCMonth() + 1, dd: we.getUTCDate() }
        };
    }


 
    const selParts = parseParts(selectedDateStr);
    const selUTC = Date.UTC(selParts.yyyy, selParts.mm - 1, selParts.dd);

    const backendStartParts = parseParts(weekData.getWeekBoundaries.weekStart);
    const backendEndParts = parseParts(weekData.getWeekBoundaries.weekEnd);

    const backendStartUTC = Date.UTC(backendStartParts.yyyy, backendStartParts.mm - 1, backendStartParts.dd);
    const backendEndUTC = Date.UTC(backendEndParts.yyyy, backendEndParts.mm - 1, backendEndParts.dd);

    let useBackend =
        selUTC >= backendStartUTC &&
        selUTC <= backendEndUTC;

    let finalStartParts, finalEndParts;

    if (useBackend) {
        console.warn("➡ Using BACKEND week boundaries");
        finalStartParts = backendStartParts;
        finalEndParts = backendEndParts;
    } else {
        console.warn("➡ Calculating NEW week boundaries");
        const range = calcWeek(selParts);
        finalStartParts = range.weekStart;
        finalEndParts = range.weekEnd;
    }

    const weekStartV2 = partsToV2(finalStartParts);
    const weekEndV2 = partsToV2(finalEndParts);

    console.log("FINAL WeekStart V2:", weekStartV2);
    console.log("FINAL WeekEnd   V2:", weekEndV2);


  



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

            function toODataDateSafe(dateStr) {
    const p = parseParts(dateStr);   // use your correct parseParts() here

    if (!p) return null;

    const utc = Date.UTC(p.yyyy, p.mm - 1, p.dd);

    return `/Date(${utc})/`;
}


            var oUser = this.getOwnerComponent().getModel("currentUser").getData();
            let employeeID = oUser.id;

            var payloadFull = {
                employee_ID: employeeID,
                weekStartDate: weekStartV2,
                weekEndDate: weekEndV2,
                project_ID: entry.project_ID || null,
                projectName: entry.projectName,
                nonProjectType_ID: entry.nonProjectTypeID,
                nonProjectTypeName: entry.nonProjectTypeName,
                task: oNewEntry.isLeaveSelected ? "Leave" : oNewEntry.workType,
    leaveType_ID: oNewEntry.isLeaveSelected ? oNewEntry.leaveType : null,
    leaveTypeName: oNewEntry.isLeaveSelected ? oNewEntry.leaveTypeName : null,
                isBillable: true,
                mondayHours: entry.mondayHours, mondayTaskDetails: entry.mondayTaskDetails || "", mondayDate: null,
                tuesdayHours: entry.tuesdayHours, tuesdayTaskDetails: entry.tuesdayTaskDetails || "", tuesdayDate: null,
                wednesdayHours: entry.wednesdayHours, wednesdayTaskDetails: entry.wednesdayTaskDetails || "", wednesdayDate: null,
                thursdayHours: entry.thursdayHours, thursdayTaskDetails: entry.thursdayTaskDetails || "", thursdayDate: null,
                fridayHours: entry.fridayHours, fridayTaskDetails: entry.fridayTaskDetails || "", fridayDate: null,
                saturdayHours: entry.saturdayHours, saturdayTaskDetails: entry.saturdayTaskDetails || "", saturdayDate: null,
                sundayHours: entry.sundayHours, sundayTaskDetails: entry.sundayTaskDetails || "", sundayDate: null
            };

            payloadFull[dayDateField] = toODataDateSafe(selectedDateStr);

            return new Promise((resolve, reject) => {
                oModel.read("/MyTimesheets", {
                    filters: [new sap.ui.model.Filter({ path: "employee_ID", operator: "EQ", value1: employeeID })],

                    success: function (oData) {
                        let items = oData?.results || [];

                        // Convert OData date -> yyyy-mm-dd
               function normalizeAnyDate(input) {
    if (!input) return null;

    // CASE 1 → JS Date object
    if (input instanceof Date && !isNaN(input)) {
        return input.toISOString().split("T")[0]; // yyyy-mm-dd
    }

    // CASE 2 → V2 format /Date(###)/
    let match = /\/Date\((\-?\d+)/.exec(input);
    if (match) {
        const ms = Number(match[1]);
        return new Date(ms).toISOString().split("T")[0];
    }

    // CASE 3 → ISO 2025-12-04
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return input;
    }

    // CASE 4 → DD/MM/YYYY or MM/DD/YYYY
    if (input.includes("/")) {
        let [a, b, c] = input.split("/");

        // fix year
        if (c.length === 2) c = "20" + c;

        // heuristic:
        // if month > 12 → input is DD/MM/YYYY
        if (Number(a) > 12) {
            return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
        }

        // otherwise assume MM/DD/YYYY (Workzone)
        return `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }

    // fallback
    let d = new Date(input);
    if (!isNaN(d)) {
        return d.toISOString().split("T")[0];
    }

    return null;
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

              let selectedISO = normalizeAnyDate(selectedDateStr);

let filteredItems = items.filter(i => {
    let storedISO = normalizeAnyDate(i[dayDateField]);
    return storedISO && selectedISO && storedISO === selectedISO;
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
                                sap.ui.core.BusyIndicator.hide();
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
                                const oTable = that.byId("timesheetTable");
        if (oTable) {
            const binding = oTable.getBinding("rows") || oTable.getBinding("items");
            if (binding) binding.refresh(true);
        }
                                resolve(data);
                            },
                            error: function (err) {
                                sap.m.MessageBox.error("Timesheet Already Exist");
                                sap.ui.core.BusyIndicator.hide();
                                if (that._oAddEntryDialog) { that._oAddEntryDialog.close(); }
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

        _formatDateForOData: function (dateStr) {
            if (!dateStr) return null;

            let [dd, mm, yyyy] = dateStr.split("/");
            return `datetime('${yyyy}-${mm}-${dd}T00:00:00')`;
        },


       
     _dayPropertyFromDate: function (dateStr) {
    if (!dateStr) return undefined;

    
    if (dateStr instanceof Date) {
        if (isNaN(dateStr.getTime())) return undefined;
        return ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][dateStr.getDay()];
    }

    if (typeof dateStr === "object") {
        dateStr = dateStr.value || dateStr.date;
        if (!dateStr) return undefined;
    }

    let day, month, year;

    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        [year, month, day] = dateStr.split("-");
        day = Number(day);
        month = Number(month);
        year = Number(year);
    }

   
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        let [dd, mm, yyyy] = dateStr.split("/").map(Number);
        day = dd; month = mm; year = yyyy;
    }

   
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
        let [p1, p2, y] = dateStr.split("/");

        // Fix year
        if (y.length === 2) y = "20" + y;

        let mm = Number(p1);
        let dd = Number(p2);

        
        if (mm <= 12 && dd <= 31) {
            day = dd;
            month = mm;
            year = Number(y);
        } 
        else {
          
            day = mm;
            month = dd;
            year = Number(y);
        }
    }

    else {
        console.warn("Invalid date format:", dateStr);
        return undefined;
    }

   
    let dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime())) {
        console.warn("Invalid date object:", dateStr);
        return undefined;
    }


    let map = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    return map[dateObj.getDay()];
},



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



           
            let newHours = Number(fNewHours) || 0;

           
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

        

            // If editing hours to 0, task details must be removed
            if (newHours === 0) {
                if (aEntries[iIndex][sDay + "TaskDetails"]) {
                    sap.m.MessageBox.warning(
                        "Task details will be removed when hours are set to 0."
                    );
                }
                sTaskDetails = "";
            }


            let previousTask = aEntries[iIndex][sDay + "TaskDetails"];
            let diff = newHours - previousHours;

          
            aEntries[iIndex][sDay] = newHours;
            aEntries[iIndex][sDay + "TaskDetails"] = sTaskDetails || "";
            oModel.setProperty("/timeEntries", aEntries);

       
            let oPayload = {
                [`${sDay}Hours`]: newHours,
                [`${sDay}TaskDetails`]: sTaskDetails || ""
            };

            sap.ui.core.BusyIndicator.show(0);
            let sPath = oEntry.id ? `/MyTimesheets(guid'${oEntry.id}')` : "/MyTimesheets";

            let fnSuccess = () => {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(`${sDay.charAt(0).toUpperCase() + sDay.slice(1)} saved successfully`);

           
                let dailyTotals = oModel.getProperty("/dailyTotals") || {};
                dailyTotals[sDay] = aEntries.reduce((sum, entry) => sum + Number(entry[sDay] || 0), 0);
                oModel.setProperty("/dailyTotals", dailyTotals);

                let totalWeekHours = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
                oModel.setProperty("/totalWeekHours", totalWeekHours.toFixed(2));

               
                this._loadTimeEntriesFromBackend();
            };

            let fnError = () => {
                sap.ui.core.BusyIndicator.hide();
              
                aEntries[iIndex][sDay] = previousHours;
                aEntries[iIndex][sDay + "TaskDetails"] = previousTask;
                oModel.setProperty("/timeEntries", aEntries);

          
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


        // onEditDailyHours: function (oEvent) {
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
        //     var oEntry = this._currentEditEntry;
        //     var sDay = this._currentEditDay;

        //     if (!oEntry || !sDay) {
        //         sap.m.MessageToast.show("Unable to edit. Please try again.");
        //         return;
        //     }

        //     // derive field names
        //     var sHoursField = sDay + "Hours";
        //     var sTaskField = sDay + "TaskDetails";
        //     var sDateField = sDay + "Date";

        //     // safely read values
        //     var fCurrentHours = Number(oEntry[sHoursField]) || 0;
        //     var sCurrentTask = oEntry[sTaskField] || "";

        //     // format date ONLY if exists
        //     var oW = this.getView().getModel("timeEntryModel").getProperty("/weekDates");
        //     var sDateRaw = oW[sDay]; // actual date, e.g. 2025-11-16T00:00:00

        //     var sDateValue = "";
        //     if (sDateRaw) {
        //         try {
        //             var oDate = new Date(sDateRaw);
        //             sDateValue = oDate.toLocaleDateString("en-US", {
        //                 month: "short",
        //                 day: "2-digit",
        //                 year: "numeric"
        //             });
        //             // Result: "Nov 16, 2025"
        //         } catch (e) {
        //             console.warn("⚠ Failed to format date:", sDateRaw, e);
        //             sDateValue = "";
        //         }
        //     }




        //     // Dropdown values 0–24
        //     var aHourOptions = [];
        //     for (var i = 0; i <= 15; i++) {
        //         aHourOptions.push(new sap.ui.core.Item({
        //             key: i.toString(),
        //             text: i + " hour" + (i !== 1 ? "s" : "")
        //         }));
        //     }

        //     // create controls with references
        //     var oHoursCombo = new sap.m.ComboBox({
        //         selectedKey: fCurrentHours.toString(),
        //         items: aHourOptions
        //     });

        //     var oTaskArea = new sap.m.TextArea({
        //         value: sCurrentTask,
        //         rows: 4,
        //         placeholder: "Describe work done..."
        //     });

        //     var oDialog = new sap.m.Dialog({
        //         title: "Edit " + this._capitalize(sDay) + " Entry",
        //         contentWidth: "350px",
        //         titleAlignment: "Center",
        //         content: [
        //             new sap.m.VBox({
        //                 items: [
        //                     // Date Field
        //                     new sap.m.VBox({
        //                         items: [
        //                             new sap.m.Label({
        //                                 text: "Date:",
        //                                 design: "Bold"
        //                             }).addStyleClass("sapUiTinyMarginBottom"),
        //                             new sap.m.Input({
        //                                 value: sDateValue,
        //                                 editable: false
        //                             })
        //                         ]
        //                     }).addStyleClass("sapUiTinyMarginBottom"),

        //                     // Project Field
        //                     new sap.m.VBox({
        //                         items: [
        //                             new sap.m.Label({
        //                                 text: "Project:",
        //                                 design: "Bold"
        //                             }).addStyleClass("sapUiTinyMarginBottom"),
        //                             new sap.m.Input({
        //                                 value: oEntry.projectName,
        //                                 editable: false
        //                             })
        //                         ]
        //                     }).addStyleClass("sapUiTinyMarginBottom"),

        //                     // Task Type Field
        //                     new sap.m.VBox({
        //                         items: [
        //                             new sap.m.Label({
        //                                 text: "Task Type:",
        //                                 design: "Bold"
        //                             }).addStyleClass("sapUiTinyMarginBottom"),
        //                             new sap.m.Input({
        //                                 value: oEntry.workType,
        //                                 editable: false
        //                             })
        //                         ]
        //                     }).addStyleClass("sapUiTinyMarginBottom"),

        //                     // Hours Field
        //                     new sap.m.VBox({
        //                         items: [
        //                             new sap.m.Label({
        //                                 text: "Hours:",
        //                                 design: "Bold",
        //                                 required: true
        //                             }).addStyleClass("sapUiTinyMarginBottom"),
        //                             oHoursCombo
        //                         ]
        //                     }).addStyleClass("sapUiTinyMarginBottom"),

        //                     // Task Details Field
        //                     new sap.m.VBox({
        //                         items: [
        //                             new sap.m.Label({
        //                                 text: "Task Details:",
        //                                 design: "Bold",
        //                                 required: true
        //                             }).addStyleClass("sapUiTinyMarginBottom"),
        //                             oTaskArea.setRows(4).setWidth("100%")
        //                         ]
        //                     })
        //                 ]
        //             }).addStyleClass("sapUiMediumMarginBeginEnd sapUiSmallMarginTopBottom")
        //         ],
        //         beginButton: new sap.m.Button({
        //             text: "Save",
        //             type: "Emphasized",
        //             icon: "sap-icon://save",
        //             press: function () {
        //                 var fNewHours = Number(oHoursCombo.getSelectedKey());
        //                 var sTaskDetails = oTaskArea.getValue();

        //                 if (isNaN(fNewHours) || fNewHours < 0 || fNewHours > 24) {
        //                     sap.m.MessageBox.error("Please select valid hours between 0 and 24");
        //                     return;
        //                 }
        //                 if (!sTaskDetails) {
        //                     sap.m.MessageBox.warning("Task Details can't be empty. Write what you did");
        //                     sap.ui.core.BusyIndicator.hide();
        //                     return;
        //                 }
        //                 this._saveEditedDayHoursAuto(oEntry, sDay, fNewHours, sTaskDetails);
        //                 oDialog.close();
        //             }.bind(this)
        //         }),
        //         endButton: new sap.m.Button({
        //             text: "Cancel",
        //             icon: "sap-icon://decline",
        //             press: function () {
        //                 oDialog.close();
        //             }
        //         }),
        //         afterClose: function () {
        //             oDialog.destroy();
        //         }
        //     });

        //     this.getView().addDependent(oDialog);

        //     oDialog.open();


        // },

//         onEditDailyHours: function (oEvent) {
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

//     if (!oEntry || !sDay) {
//         sap.m.MessageToast.show("Unable to edit. Please try again.");
//         return;
//     }

 
//     var sHoursField = sDay + "Hours";
//     var sTaskField = sDay + "TaskDetails";

//     var fCurrentHours = Number(oEntry[sHoursField]) || 0;
//     var sCurrentTask = oEntry[sTaskField] || "";

//     var weekDates = this.getView().getModel("timeEntryModel").getProperty("/weekDates") || {};
//     var rawDate = weekDates[sDay];
//     var displayDate = "";

//     try {
//         if (rawDate) {
//             var dt = new Date(rawDate);
//             displayDate = dt.toLocaleDateString("en-US", {
//                 month: "short",
//                 day: "2-digit",
//                 year: "numeric"
//             });
//         }
//     } catch (e) {
//         console.warn("Date formatting failed: ", rawDate, e);
//     }

//     const isLeaveEntry =
//         (oEntry.nonProjectTypeName && oEntry.nonProjectTypeName.toLowerCase().includes("leave")) ||
//         (oEntry.workType && ["personal", "sick", "half", "leave"].some(x =>
//             oEntry.workType.toLowerCase().includes(x)
//         ));

//     // ---------------------------------------------------------
//     // Dropdown values 0–15 Hours
//     // ---------------------------------------------------------
//     var aHourOptions = [];
//     for (var i = 0; i <= 15; i++) {
//         aHourOptions.push(new sap.ui.core.Item({
//             key: i.toString(),
//             text: i + " hour" + (i === 1 ? "" : "s")
//         }));
//     }


//     var oHoursCombo = new sap.m.ComboBox({
//         selectedKey: fCurrentHours.toString(),
//         items: aHourOptions,
//         width: "100%",
//         enabled: !isLeaveEntry
//     });

  
//     var oTaskArea = new sap.m.TextArea({
//         value: sCurrentTask,
//         rows: 4,
//         placeholder: "Describe work done...",
//         width: "100%",
//         editable: !isLeaveEntry
//     });

   
//     var oDialog = new sap.m.Dialog({
//         title: "Edit " + this._capitalize(sDay) + " Entry",
//         contentWidth: "350px",
//         titleAlignment: "Center",

//         content: [
//             new sap.m.VBox({
//                 items: [

//                     // DATE
//                     new sap.m.VBox({
//                         items: [
//                             new sap.m.Label({ text: "Date:", design: "Bold" }),
//                             new sap.m.Input({ value: displayDate, editable: false })
//                         ]
//                     }).addStyleClass("sapUiSmallMarginBottom"),

//                     // PROJECT or NON-PROJECT
//                     new sap.m.VBox({
//                         items: [
//                             new sap.m.Label({ text: "Project:", design: "Bold" }),
//                             new sap.m.Input({
//                                 value: oEntry.projectName || oEntry.nonProjectTypeName,
//                                 editable: false
//                             })
//                         ]
//                     }).addStyleClass("sapUiSmallMarginBottom"),

//                     // TASK TYPE or LEAVE TYPE
//                     new sap.m.VBox({
//                         items: [
//                             new sap.m.Label({
//                                 text: isLeaveEntry ? "Leave Type:" : "Task Type:",
//                                 design: "Bold"
//                             }),
//                             new sap.m.Input({
//                                 value: oEntry.workType, // leaveTypeName OR task
//                                 editable: false
//                             })
//                         ]
//                     }).addStyleClass("sapUiSmallMarginBottom"),

//                     // HOURS
//                     new sap.m.VBox({
//                         items: [
//                             new sap.m.Label({
//                                 text: "Hours:",
//                                 design: "Bold",
//                                 required: !isLeaveEntry
//                             }),
//                             oHoursCombo
//                         ]
//                     }).addStyleClass("sapUiSmallMarginBottom"),

//                     // TASK DETAILS
//                     new sap.m.VBox({
//                         items: [
//                             new sap.m.Label({
//                                 text: isLeaveEntry ? "Leave Details:" : "Task Details:",
//                                 design: "Bold",
//                                 required: !isLeaveEntry
//                             }),
//                             oTaskArea
//                         ]
//                     })
//                 ]
//             }).addStyleClass("sapUiMediumMarginBeginEnd sapUiSmallMarginTopBottom")
//         ],

//         // ---------------------------------------------------------
//         // SAVE BUTTON — blocked when leave entry (no editing allowed)
//         // ---------------------------------------------------------
//         beginButton: new sap.m.Button({
//             text: "Save",
//             type: "Emphasized",
//             icon: "sap-icon://save",

//             press: function () {

//                 if (isLeaveEntry) {
//                     sap.m.MessageToast.show("Leave entries cannot be edited.");
//                     oDialog.close();
//                     return;
//                 }

//                 var newHours = Number(oHoursCombo.getSelectedKey());
//                 var newDetails = oTaskArea.getValue();

//                 if (isNaN(newHours) || newHours < 0 || newHours > 24) {
//                     sap.m.MessageBox.error("Select hours between 0 and 24");
//                     return;
//                 }
//                 if (!newDetails.trim()) {
//                     sap.m.MessageBox.warning("Task details cannot be empty.");
//                     return;
//                 }

//                 this._saveEditedDayHoursAuto(oEntry, sDay, newHours, newDetails);
//                 oDialog.close();
//             }.bind(this)
//         }),

//         endButton: new sap.m.Button({
//             text: "Cancel",
//             icon: "sap-icon://decline",
//             press: function () { oDialog.close(); }
//         }),

//         afterClose: function () { oDialog.destroy(); }
//     });

//     this.getView().addDependent(oDialog);
//     oDialog.open();
// },


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

    if (!oEntry || !sDay) {
        sap.m.MessageToast.show("Unable to edit. Please try again.");
        return;
    }

    // Detect if THIS day already has a leave entry
let currentDayIsLeave = false;

switch (sDay) {
    case "monday": currentDayIsLeave = oEntry.mondayIsLeave; break;
    case "tuesday": currentDayIsLeave = oEntry.tuesdayIsLeave; break;
    case "wednesday": currentDayIsLeave = oEntry.wednesdayIsLeave; break;
    case "thursday": currentDayIsLeave = oEntry.thursdayIsLeave; break;
    case "friday": currentDayIsLeave = oEntry.fridayIsLeave; break;
}

// If this exact day already has a leave entry → block updates completely
if (currentDayIsLeave) {
    sap.m.MessageToast.show("Leave is already applied for this day. It cannot be modified.");
    return;   
}


    var sHoursField = sDay + "Hours";
    var sTaskField = sDay + "TaskDetails";

    var fCurrentHours = Number(oEntry[sHoursField]) || 0;
    var sCurrentTask = oEntry[sTaskField] || "";

    var weekDates = this.getView().getModel("timeEntryModel").getProperty("/weekDates") || {};
    var rawDate = weekDates[sDay];
    var displayDate = "";

    try {
        if (rawDate) {
            var dt = new Date(rawDate);
            displayDate = dt.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric"
            });
        }
    } catch (e) {
        console.warn("Date formatting failed: ", rawDate, e);
    }

    
    // Detect leave entry
   
    const isLeaveEntry =
        (oEntry.nonProjectTypeName && oEntry.nonProjectTypeName.toLowerCase().includes("leave")) ||
        (oEntry.workType && ["personal", "sick", "half", "leave"].some(x =>
            oEntry.workType.toLowerCase().includes(x)
        ));
    
    // Block ONLY IF: Weekend + Leave entry
if ((sDay === "saturday" || sDay === "sunday") && isLeaveEntry) {
    return;
}


    
    const isLeaveDay = isLeaveEntry && fCurrentHours > 0;

    // If leave day → hide everything and disable editing
    const leaveHoursAllowed = ["4", "8"];
    // Determine which hours to show for leave types
let aHourOptions = [];

if (isLeaveDay) {

    sap.m.MessageToast.show("Leave entry cannot be edited for this day.");

} else if (isLeaveEntry) {

    // Normalize leave type
    let leaveTypeLower = (oEntry.workType || "").toLowerCase();

    if (leaveTypeLower.includes("half")) {
        // ⭐ Half Day Leave → 4 hours ONLY
        aHourOptions.push(new sap.ui.core.Item({ key: "4", text: "4" }));

    } else if (leaveTypeLower.includes("personal") || leaveTypeLower.includes("sick")) {
        // ⭐ Personal or Sick → 4 & 8 hours
        ["4", "8"].forEach(h => {
            aHourOptions.push(new sap.ui.core.Item({ key: h, text: h }));
        });

    } else {
        // Default leave fallback → allow 4 & 8
        ["4", "8"].forEach(h => {
            aHourOptions.push(new sap.ui.core.Item({ key: h, text: h }));
        });
    }

} else {
    // ⭐ Normal task (not leave) → allow 0–15 hours
    for (let i = 0; i <= 15; i++) {
        aHourOptions.push(new sap.ui.core.Item({
            key: i.toString(),
            text: i + " hour" + (i === 1 ? "" : "s")
        }));
    }
}


    

    var oHoursCombo = new sap.m.ComboBox({
        selectedKey: fCurrentHours.toString(),
        items: aHourOptions,
        placeholder: "Select Hours",
        width: "100%",
        enabled: !isLeaveDay
    });

    // --------------------------
    // Task details
    // --------------------------
    var oTaskArea = new sap.m.TextArea({
        value: isLeaveEntry ? sCurrentTask : sCurrentTask,
        rows: 4,
        placeholder: "Describe work done...",
        width: "100%",
        editable: !isLeaveDay
    });

    
    // Build dialog
    var oDialog = new sap.m.Dialog({
        title: "Edit " + this._capitalize(sDay) + " Entry",
        contentWidth: "350px",
        titleAlignment: "Center",

        content: [
            new sap.m.VBox({
                items: [

                    // DATE
                    new sap.m.VBox({
                        items: [
                            new sap.m.Label({ text: "Date:", design: "Bold" }),
                            new sap.m.Input({ value: displayDate, editable: false })
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom"),

                    // PROJECT/NON-PROJECT
                    new sap.m.VBox({
                        items: [
                            new sap.m.Label({ text: "Project:", design: "Bold" }),
                            new sap.m.Input({
                                value: oEntry.projectName || oEntry.nonProjectTypeName,
                                editable: false
                            })
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom"),

                    // TASK/LEAVE TYPE
                    new sap.m.VBox({
                        items: [
                            new sap.m.Label({
                                text: isLeaveEntry ? "Leave Type:" : "Task Type:",
                                design: "Bold"
                            }),
                            new sap.m.Input({
                                value: oEntry.workType,
                                editable: false
                            })
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom"),

                    // HOURS (Hidden if leave day)
                    new sap.m.VBox({
                        visible: !isLeaveDay,
                        items: [
                            new sap.m.Label({
                                text: "Hours:",
                                design: "Bold",
                                required: !isLeaveEntry
                            }),
                            oHoursCombo
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom"),

                    // TASK DETAILS (Hidden if leave day)
                    new sap.m.VBox({
                        visible: !isLeaveDay,
                        items: [
                            new sap.m.Label({
                                text: isLeaveEntry ? "Leave Details:" : "Task Details:",
                                design: "Bold",
                                required: !isLeaveEntry
                            }),
                            oTaskArea
                        ]
                    })
                ]
            }).addStyleClass("sapUiMediumMarginBeginEnd sapUiSmallMarginTopBottom")
        ],

       
        // SAVE BUTTON
        beginButton: new sap.m.Button({
            text: "Save",
            type: "Emphasized",
            icon: "sap-icon://save",

            press: function () {

                // --- Get all existing entries from model ---


                if (isLeaveDay) {
                    sap.m.MessageToast.show("Leave already applied for this day. Editing is not allowed.");
                    oDialog.close();
                    return;
                }

                if (isLeaveEntry) {
                    let newHours = oHoursCombo.getSelectedKey();
                    let taskDetails = oTaskArea.getValue();

                    if (!leaveHoursAllowed.includes(newHours)) {
                        sap.m.MessageBox.error("Only 4 or 8 hours allowed for Leave.");
                        return;
                    }

                    if(!taskDetails){
                        sap.m.MessageBox.error("Leave Details Manadaory");
                        return;
                    }

                    let allEntries = this.getView().getModel("timeEntryModel").getProperty("/timeEntries") || [];

// Map day → field name
let dayHoursField = sDay + "Hours";

// Check if ANY OTHER entry has leave on this same day
let anotherLeaveExists = allEntries.some(e => {
    if (e.id === oEntry.id) return false; // skip same row
    return (
        e.workType &&
        e.workType.toLowerCase().includes("leave") &&
        Number(e[dayHoursField]) > 0
    );
});

if (anotherLeaveExists) {
    sap.m.MessageBox.error(
        `Leave is already applied for ${this._capitalize(sDay)}`
    );
    oDialog.close();
    return; 
}


                    this._saveEditedDayHoursAuto(oEntry, sDay, Number(newHours), taskDetails);
                    oDialog.close();
                    return;
                }

                // NORMAL TASK SAVE
                var newHours = Number(oHoursCombo.getSelectedKey());
                var newDetails = oTaskArea.getValue();

                if (isNaN(newHours) || newHours < 0 || newHours > 24) {
                    sap.m.MessageBox.error("Select hours between 0 and 24");
                    return;
                }
                if (!newDetails.trim()) {
                    sap.m.MessageBox.warning("Task details cannot be empty.");
                    return;
                }

                this._saveEditedDayHoursAuto(oEntry, sDay, newHours, newDetails);
                oDialog.close();
            }.bind(this)
        }),

        endButton: new sap.m.Button({
            text: "Cancel",
            icon: "sap-icon://decline",
            press: function () { oDialog.close(); }
        }),

        afterClose: function () { oDialog.destroy(); }
    });

    this.getView().addDependent(oDialog);
    oDialog.open();
},

        _validateMandatoryFields: function (entry) {
            if (!entry) {
                sap.m.MessageBox.error("No entry data found.");
                return false;
            }

            const hasProject = entry.projectId && entry.projectId.trim() !== "";
            const hasNonProject = entry.nonProjectTypeID && entry.nonProjectTypeID.trim() !== "";

            // Project / Non-Project Selection Check
            if (!hasProject && !hasNonProject) {
                sap.m.MessageBox.error("Please select a Project or Non-Project Activity.");
                return false;
            }

            // Work type check ONLY if Project is chosen
            if (hasProject) {
                if (!entry.workType || entry.workType.trim() === "") {
                    sap.m.MessageBox.error("Work Type is required when Project is selected.");
                    return false;
                }
            }

            // Hours
            let hours = parseFloat(entry.hours);
            if (isNaN(hours) || hours <= 0 || hours > 15) {
                sap.m.MessageBox.error("Hours must be between 1 and 15.");
                return false;
            }

            // Task Details (always needed)
            if (!entry.taskDetails || entry.taskDetails.trim() === "") {
                sap.m.MessageBox.error("Please enter Task Details.");
                return false;
            }

            return true; // All validations passed 👍
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
                            let finalProjectName = item.projectName
                                ? item.projectName
                                : item.nonProjectTypeName || "";

                            const isLeaveEntry =
    (item.nonProjectTypeName && item.nonProjectTypeName.toLowerCase().includes("leave")) ||
    (item.task && item.task.toLowerCase().includes("leave"));

                            return {
                                id: item.ID,
                                totalWeekHours: item.totalWeekHours,
                                projectId: item.project_ID,
                                projectName: finalProjectName,
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
                                dates: oModel.getProperty("/weekDates"),

                                mondayIsLeave: isLeaveEntry && Number(item.mondayHours) > 0,
tuesdayIsLeave: isLeaveEntry && Number(item.tuesdayHours) > 0,
wednesdayIsLeave: isLeaveEntry && Number(item.wednesdayHours) > 0,
thursdayIsLeave: isLeaveEntry && Number(item.thursdayHours) > 0,
fridayIsLeave: isLeaveEntry && Number(item.fridayHours) > 0,

// weekends cannot have leave → always false
saturdayIsLeave: false,
sundayIsLeave: false,

                            };
                        });

                        // 🧨 New delete eligibility check!!
                        weekData.forEach(row => {
                            row.canDelete = this._checkRowDeleteEligibility(row);
                        });
                    }
                    else {
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

                    // Validate data
                    if (!oData || !oData.results || !oData.results.length) {
                        sap.m.MessageBox.warning("No profile data found.");
                        return;
                    }

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
                        userRole: oRawProfile.roleName || ""
                    };

                    // JSONModel for fragment
                    var oProfileModel = new sap.ui.model.json.JSONModel({ profile: oProfile });

                    // Load fragment if not already loaded
                    if (!this._oProfileDialog) {
                        // Use createId() for unique prefix to avoid ID clashes
                        this._oProfileDialog = sap.ui.xmlfragment(
                            this.createId("profileDialogFrag"),
                            "employee.Fragments.ProfileDialog",
                            this
                        );
                        oView.addDependent(this._oProfileDialog);
                    }

                    // Set model to fragment
                    this._oProfileDialog.setModel(oProfileModel, "view");

                    // Optional: set employee name inside fragment


                    // Open the dialog
                    this._oProfileDialog.open();

                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to load profile data.");
                    console.error("Profile load error:", oError);
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

            if (!oDataModel) {
                sap.m.MessageBox.error("OData model not found. Fix your manifest my dude.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            oDataModel.read("/BookedHoursOverview", {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();

                    if (!oData || !oData.results || !oData.results.length) {
                        sap.m.MessageBox.warning("Bro, no booked hours data found.");
                        return;
                    }

                    let aResults = oData.results;

                    // Build clean report UI text
                    let sReport = "📊 Project Booked Hours Report\n\n";

                    aResults.forEach(function (oProject) {
                        sReport += "📌 Project: " + oProject.Project + "\n";
                        sReport += "🕒 Allocated Hours: " + oProject.AllocatedHours + "\n";
                        sReport += "⏱️ Booked Hours: " + oProject.BookedHours + "\n";
                        sReport += "💡 Remaining Hours: " + oProject.RemainingHours + "\n";
                        sReport += "📈 Utilization: " + oProject.Utilization + "\n";
                        sReport += "──────────────────────────────\n";
                    });

                    sap.m.MessageBox.information(sReport, {
                        title: "Booked Hours Overview"
                    });
                },
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to load Booked Hours Overview.");
                    console.error("OData Error: ", oError);
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
        },


    onOpenLeaveBalance: function () {
    var oView = this.getView();
    var that = this;

    // Create JSON model if not exists
    if (!this._leaveBalanceModel) {
        this._leaveBalanceModel = new sap.ui.model.json.JSONModel();
        oView.setModel(this._leaveBalanceModel, "leaveBalanceModel");
    }

    var oModel = that.getOwnerComponent().getModel("timesheetServiceV2");

    oModel.read("/MyLeaveBalance", {
        success: function (oData) {

            var aResults = oData.results || [];

            // Extract employee info from first item
            var employeeName = aResults.length > 0 ? aResults[0].employeeName : "";
            var year = aResults.length > 0 ? aResults[0].year : "";

            // Prepare final JSON model structure
            var oFinalData = {
                employeeName: employeeName,
                year: year,
                leaves: aResults  
            };

            that._leaveBalanceModel.setData(oFinalData);

            // Open dialog
            that._openLeaveBalanceFragment();
        },
        error: function () {
            sap.m.MessageToast.show("Failed to load leave balance");
        }
    });
},

_openLeaveBalanceFragment: function () {
    if (!this._leaveBalFrag) {
        this._leaveBalFrag = sap.ui.xmlfragment(
            "employee.Fragments.LeaveBalance",
            this
        );
        this.getView().addDependent(this._leaveBalFrag);
    }

    // Get employee name from model
    var sName = this._leaveBalanceModel.getProperty("/employeeName") || "";

    // Set title as "Leave Balance - Name"
    this._leaveBalFrag.setTitle("Leave Balance – " + sName);

    this._leaveBalFrag.open();
},



onCloseLeaveBalance: function () {
    this._leaveBalFrag.close();
},

onDownloadDocument: function () {
    const oModel = this.getOwnerComponent().getModel("timesheetServiceV2");
    const that = this;

    sap.ui.core.BusyIndicator.show(0);

    // 1️⃣ Read Available Documents
    oModel.read("/AvailableDocuments", {
        success: function (oData) {
            sap.ui.core.BusyIndicator.hide();

            if (!oData.results || oData.results.length === 0) {
                sap.m.MessageToast.show("No documents available for download");
                return;
            }

            // 2️⃣ Always use the first document (common PDF)
            const documentID = oData.results[0].documentID;

            console.log("Document ID from backend:", documentID);

            if (!documentID) {
                sap.m.MessageToast.show("Document ID missing from backend");
                return;
            }

            // 3️⃣ Now call download function
            that._downloadDocument(documentID);
        },

        error: function () {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageToast.show("Failed to fetch document list");
        }
    });
},

_downloadDocument: function (documentID) {

    sap.ui.core.BusyIndicator.show(0);

    const url = `/odata/v4/employee/downloadDocument?documentID='${documentID}'`;

    fetch(url, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    })
    .then(async response => {
        sap.ui.core.BusyIndicator.hide();

        if (!response.ok) {
            sap.m.MessageToast.show("Document download failed");
            return;
        }

        const res = await response.json();

        const bytes = atob(res.content).split("").map(c => c.charCodeAt(0));
        const blob = new Blob([new Uint8Array(bytes)], { type: res.mimeType });

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = res.fileName;
        a.click();
        URL.revokeObjectURL(blobUrl);
    })
    .catch(err => {
        sap.ui.core.BusyIndicator.hide();
        console.error("Download error", err);
        sap.m.MessageToast.show("Download failed");
    });
}














    });
});






UPDATED CODE 5
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/MessageBox",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/Select",
  "sap/ui/core/Item",
  "sap/m/Input",
  "sap/m/DatePicker",
  "sap/m/Button",
  "sap/m/Dialog",
  "sap/m/Text",
  "sap/m/Label",
  "sap/ui/layout/form/SimpleForm",
  "sap/m/ToolbarSpacer",
  "sap/m/Toolbar",
  "sap/ui/model/odata/v2/ODataModel",
  "sap/m/VBox",
  "sap/m/ComboBox",
  "sap/ui/core/BusyIndicator"
], function (Controller, MessageToast, JSONModel, Fragment, MessageBox, Filter, FilterOperator, Select, Item, Input, DatePicker, Button, Dialog, Text, Label, SimpleForm, ToolbarSpacer, Toolbar, ODataModel, VBox, ComboBox, BusyIndicator) {
  "use strict";

  return Controller.extend("admin.controller.Admin", {

onInit: function () {
  // Initialize main model for UI data
  var oModel = new JSONModel({
    users: [],
    projects: [],
    projectHours: [],
    managerTeams: [],
    projectDurations: [],
    selectedEmployee: "",
    selectedDate: new Date(), // Add selectedDate property for DatePicker
    // Timesheet data
    currentWeekStart: this._getWeekStart(new Date()),
    weekDays: [],
    timesheetEntries: [],
    employeeProjects: [], // Store projects for selected employee
    weekDates: {}, // Add weekDates property for the new onTaskDetailPress function
    // Add overall progress data
    overallProgress: {
      totalBookedHours: 0,
      totalAllocatedHours: 0,
      totalRemainingHours: 0,
      averageUtilization: 0
    }
  });
  this.getView().setModel(oModel);

  // Load initial data from OData services
  this._loadEmployees();
  this._loadProjects();
  this._loadOverallProgress(); // Load overall progress data

  // Initialize timesheet
  this._initializeTimesheet();

  // Restore selected employee from localStorage if available
  var storedEmployeeId = localStorage.getItem("selectedEmployeeId");
  if (storedEmployeeId) {
    oModel.setProperty("/selectedEmployee", storedEmployeeId);
    // Load timesheet for the stored employee immediately
    var weekStart = oModel.getProperty("/currentWeekStart");
    var weekEnd = this._getWeekEnd(weekStart);
    this._loadAdminTimesheetData(storedEmployeeId, weekStart, weekEnd);
  }
  
  // Add a handler to synchronize the employee list with the dropdown
  this.getView().attachModelContextChange(function() {
    var oModel = this.getView().getModel();
    var selectedEmployee = oModel.getProperty("/selectedEmployee");
    var oEmployeeList = this.byId("employeeList");
    
    if (oEmployeeList && selectedEmployee) {
      // Find the item with the matching employee ID
      var aItems = oEmployeeList.getItems();
      for (var i = 0; i < aItems.length; i++) {
        var oItem = aItems[i];
        var oContext = oItem.getBindingContext();
        if (oContext && oContext.getProperty("userId") === selectedEmployee) {
          oEmployeeList.setSelectedItem(oItem);
          break;
        }
      }
    }
  }.bind(this));
},




   onEmployeeListSelect: function(oEvent) {
  var oItem = oEvent.getParameter("listItem");
  var oContext = oItem.getBindingContext();
  var employeeId = oContext.getProperty("userId");
  
  var oModel = this.getView().getModel();
  oModel.setProperty("/selectedEmployee", employeeId);
  
  // Store selected employee in localStorage
  localStorage.setItem("selectedEmployeeId", employeeId);
  
  // Load timesheet for the selected employee
  var weekStart = oModel.getProperty("/currentWeekStart");
  var weekEnd = this._getWeekEnd(weekStart);
  this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
},

// Add this new function to handle "See More" button click
onSeeMoreEmployees: function() {
  var oModel = this.getView().getModel();
  var visibleItems = oModel.getProperty("/visibleItems") || 10;
  var totalItems = oModel.getProperty("/totalUsers");
  
  // Increase visible items by 10
  visibleItems = Math.min(visibleItems + 10, totalItems);
  oModel.setProperty("/visibleItems", visibleItems);
  
  // Hide "See More" button if all items are visible
  oModel.setProperty("/showSeeMore", visibleItems < totalItems);
},



    onLogoutPress: function () {
  var that = this;

  // Show confirmation popup
  MessageBox.confirm(
    "Are you sure you want to logout?",
    {
      title: "Confirm Logout",
      icon: MessageBox.Icon.QUESTION,
      actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
      emphasizedAction: MessageBox.Action.OK,
      onClose: function (sAction) {
        if (sAction === MessageBox.Action.OK) {
          // User confirmed logout
          that._performLogout();
        }
      }
    }
  );
},

// Helper function to perform the actual logout
_performLogout: function () {
  // Show busy indicator
  BusyIndicator.show(0);
  
  try {
    // Clear localStorage (especially the selected employee)
    localStorage.removeItem("selectedEmployeeId");
    localStorage.clear();
    
    // Clear sessionStorage if used
    sessionStorage.clear();
    
    // Reset the model to initial state
    var oModel = this.getView().getModel();
    if (oModel) {
      oModel.setData({
        users: [],
        projects: [],
        projectHours: [],
        managerTeams: [],
        projectDurations: [],
        selectedEmployee: "",
        selectedDate: new Date(),
        currentWeekStart: this._getWeekStart(new Date()),
        weekDays: [],
        timesheetEntries: [],
        employeeProjects: [],
        weekDates: {},
        overallProgress: {
          totalBookedHours: 0,
          totalAllocatedHours: 0,
          totalRemainingHours: 0,
          averageUtilization: 0
        }
      });
    }
    
    // Show success message
    MessageToast.show("Logged out successfully");
    
    // Navigate to login page after a short delay
    var that = this;
    setTimeout(function() {
      // Get router and navigate to login route
      var oRouter = that.getOwnerComponent().getRouter();
      if (oRouter) {
        // Replace the history so user can't go back with browser back button
        oRouter.navTo("RouteLogin", {}, true);
      } else {
        // Fallback: reload the app or redirect to login
        window.location.href = "/index.html";
      }
      BusyIndicator.hide();
    }, 1000);
    
  } catch (error) {
    console.error("Error during logout:", error);
    BusyIndicator.hide();
    MessageToast.show("Error during logout. Please try again.");
  }
},

    onAnalyticsPress: function () {
      var that = this;

      // Create dialog only once
      if (!this._oAnalyticsDialog) {

        // Outer container
        var oContentVBox = new sap.m.VBox({
          items: [

            // Section Header: Progress Reports
            new sap.m.Title({
              text: "Progress Reports:",
              
            }).addStyleClass("sapUiSmallMarginTop sapUiSmallMarginBottom sapUiSmallMarginBegin"),

            // Dynamic project list container
            new sap.m.VBox(this.createId("projectListContainer"))
              .addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginEnd sapUiTinyMarginBottom")
          ]
        });

        // Scroll wrapper
        var oScroll = new sap.m.ScrollContainer({
          width: "100%",
          height: "100%",
          vertical: true,
          content: [oContentVBox]
        });

        // Dialog UI
        this._oAnalyticsDialog = new sap.m.Dialog({
          title: "Project Progress Summary",
          icon: "sap-icon://message-information",
          type: "Message",
          contentWidth: "420px",
          contentHeight: "70vh",
          stretch: sap.ui.Device.system.phone,
          verticalScrolling: false,
          content: [oScroll],
          beginButton: new sap.m.Button({
            text: "OK",
            type: "Emphasized",
            press: function () {
              that._oAnalyticsDialog.close();
            }
          })
        });

        this.getView().addDependent(this._oAnalyticsDialog);
      }

      // Open dialog
      this._oAnalyticsDialog.open();

      // Show loading icon
      var oContainer = this.byId("projectListContainer");
      oContainer.removeAllItems();
      oContainer.addItem(
        new sap.m.BusyIndicator({
          size: "2rem"
        }).addStyleClass("sapUiMediumMargin")
      );

      // Call OData service
      var oModel = this.getOwnerComponent().getModel("adminService");

      oModel.read("/Projects", {
        success: function (oData) {
          var aProjects = oData.results || [];

          oContainer.removeAllItems();

          if (aProjects.length === 0) {
            oContainer.addItem(new sap.m.Text({ text: "No projects found." }));
            return;
          }

          aProjects.forEach(function (oProj, index) {
            var sName = oProj.projectName || "Unnamed Project";
            var sStart = oProj.startDate ?
              new Date(oProj.startDate).toLocaleDateString("en-GB") : "";
            var sEnd = oProj.endDate ?
              new Date(oProj.endDate).toLocaleDateString("en-GB") : "";
            var sStatus = oProj.status || "Draft";
            var iHours = oProj.usedHours || 0;

            // Project block (same style as screenshot)
            var oBlock = new sap.m.VBox({
              items: [
                new sap.m.Title({
                  text: "Project: " + sName,
                  level: "H6"
                }).addStyleClass("sapUiTinyMarginBottom"),

                new sap.m.FormattedText({
                  htmlText:
                    "<strong>Total Hours Worked:</strong> " + iHours + "<br>" +
                    "<strong>Start Date:</strong> " + sStart + "<br>" +
                    "<strong>End Date:</strong> " + sEnd + "<br>" +
                    "<strong>Status:</strong> " + sStatus
                })
              ]
            }).addStyleClass("sapUiSmallMarginBottom sapUiTinyMarginBeginEnd");

            oContainer.addItem(oBlock);

            // Separator (except after last item)
            if (index < aProjects.length - 1) {
              oContainer.addItem(
                new sap.m.HBox({
                  height: "1px"
                }).addStyleClass("separatorLine")
              );
            }
          });
        },

        error: function () {
          oContainer.removeAllItems();
          oContainer.addItem(
            new sap.m.MessageStrip({
              text: "Failed to load project data.",
              type: "Error",
              showIcon: true
            })
          );
        }
      });
    },


    // ------------------------------------------------------------------
    // 2. Notification Button → Show all Notifications from /Notifications
    // ------------------------------------------------------------------
    onNotificationPress: function () {
      if (!this._oNotificationDialog) {
        this._oNotificationDialog = new sap.m.Dialog({
          title: "Notifications",
          contentWidth: "80%",
          contentHeight: "75vh",
          stretch: sap.ui.Device.system.phone,
          content: new sap.m.List({
            id: this.createId("notificationList"),
            noDataText: "No notifications found",
            mode: sap.m.ListMode.None,
            items: {
              path: "/notifications",
              template: new sap.m.StandardListItem({
                title: "{title}",
                description: "{message}",
                info: "{createdAt}",
                infoState: "{= ${read} ? 'Success' : 'Warning' }",
                icon: "{= ${read} ? 'sap-icon://message-success' : 'sap-icon://message-information' }"
              })
            }
          }),
          beginButton: new sap.m.Button({
            text: "Close",
            press: function () {
              this._oNotificationDialog.close();
            }.bind(this)
          }),
          afterClose: function () {
            // keep data – will be refreshed on next open
          }
        });

        this.getView().addDependent(this._oNotificationDialog);
      }

      // Show + busy
      this._oNotificationDialog.open();
      this.byId("notificationList").setBusy(true);

      var oODataModel = this.getOwnerComponent().getModel("adminService");

      oODataModel.read("/Notifications", {
        success: function (oData) {
          var aNotifications = oData.results || oData.value || [];

          // Sort newest first
          aNotifications.sort(function (a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          });

          // Optional: format date nicely
          aNotifications.forEach(function (n) {
            if (n.createdAt) {
              var oDate = new Date(n.createdAt);
              n.createdAt = oDate.toLocaleDateString() + " " + oDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            n.title = n.title || "Notification";
            n.message = n.message || "";
            n.read = n.read === true;
          });

          var oJSONModel = new sap.ui.model.json.JSONModel({ notifications: aNotifications });
          this.byId("notificationList").setModel(oJSONModel);
          this.byId("notificationList").setBusy(false);
        }.bind(this),
        error: function (oError) {
          this.byId("notificationList").setBusy(false);
          sap.m.MessageToast.show("Error loading Notifications: " + (oError.message || "Unknown error"));
        }.bind(this)
      });
    },

  _loadOverallProgress: function () {
  var oModel = this.getOwnerComponent().getModel("adminService");
  var oViewModel = this.getView().getModel();

  BusyIndicator.show(0);

  oModel.read("/OverallProgressReport", {
    success: function (oData) {
      BusyIndicator.hide();

      var aEntries = oData.results || [];
      var oProjectMap = {};  // To remove duplicates & group by project

      aEntries.forEach(function (oItem) {
        var sProjectId = oItem.projectID || "unknown";
        var sProjectName = oItem.projectName || "Unknown Project";

        var nAllocated = parseFloat(oItem.allocatedHours) || 0;
        var nBookedRaw = parseFloat(oItem.totalBookedHours) || 0;

        // CRITICAL: Your backend returns "1.00" for draft/no real booking → show as 0
        var nBooked = (nBookedRaw >= 2) ? Math.round(nBookedRaw) : 0;
        var nRemaining = nAllocated - nBooked;

        // Keep only the entry with highest allocated hours per project (eliminates duplicates)
        if (!oProjectMap[sProjectId] || nAllocated > (oProjectMap[sProjectId].allocatedHours || 0)) {
          oProjectMap[sProjectId] = {
            project: sProjectName,  // This binds to the "Project" column in the table
            allocatedHours: nAllocated,
            bookedHours: nBooked,
            remainingHours: nRemaining > 0 ? nRemaining : 0,
            // Including additional fields from the endpoint that might be needed
            projectID: sProjectId,
            activityName: oItem.activityName,
            budget: oItem.budget,
            employeeID: oItem.employeeID,
            employeeName: oItem.employeeName,
            managerID: oItem.managerID,
            managerName: oItem.managerName,
            status: oItem.status,
            task: oItem.task
          };
        }
      });

      // Convert map → array
      var aProjectHours = Object.keys(oProjectMap).map(function (key) {
        return oProjectMap[key];
      });

      // Sort alphabetically by project name (exact match to your UI)
      aProjectHours.sort(function (a, b) {
        return a.project.localeCompare(b.project);
      });

      // Bind to table
      oViewModel.setProperty("/projectHours", aProjectHours);

      // Calculate overall totals
      var nTotalAllocated = aProjectHours.reduce((sum, p) => sum + p.allocatedHours, 0);
      var nTotalBooked = aProjectHours.reduce((sum, p) => sum + p.bookedHours, 0);
      var nTotalRemaining = nTotalAllocated - nTotalBooked;
      var nAvgUtilization = nTotalAllocated > 0 ? Math.round((nTotalBooked / nTotalAllocated) * 100) : 0;

      oViewModel.setProperty("/overallProgress", {
        totalAllocatedHours: nTotalAllocated,
        totalBookedHours: nTotalBooked,
        totalRemainingHours: nTotalRemaining,
        averageUtilization: nAvgUtilization
      });

      oViewModel.refresh(true);
    },

    error: function (oError) {
      BusyIndicator.hide();
      console.error("Error loading OverallProgressReport:", oError);
      MessageToast.show("Failed to load project analytics data");

      oViewModel.setProperty("/projectHours", []);
      oViewModel.setProperty("/overallProgress", {
        totalAllocatedHours: 0,
        totalBookedHours: 0,
        totalRemainingHours: 0,
        averageUtilization: 0
      });
    }
  });
},

    // Replace the existing onTaskDetailPress with this improved version
    onTaskDetailPress: function (oEvent) {
  try {
    var oButton = oEvent.getSource();
    var oBindingContext = oButton.getBindingContext();

    if (!oBindingContext) {
      sap.m.MessageToast.show("Unable to get binding context");
      return;
    }

    var oEntry = oBindingContext.getObject();
    var oModel = this.getView().getModel();
    var oWeekDates = this._getWeekDates(); // Get week dates from model

    if (!oWeekDates) {
      sap.m.MessageToast.show("Week dates not available");
      return;
    }

    // Ensure dailyComments exists
    oEntry.dailyComments = oEntry.dailyComments || {};

    var that = this; // if needed inside controller

    var aDays = [
      { name: "Monday", hours: oEntry.monday || 0, comment: oEntry.mondayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.monday) },
      { name: "Tuesday", hours: oEntry.tuesday || 0, comment: oEntry.tuesdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.tuesday) },
      { name: "Wednesday", hours: oEntry.wednesday || 0, comment: oEntry.wednesdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.wednesday) },
      { name: "Thursday", hours: oEntry.thursday || 0, comment: oEntry.thursdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.thursday) },
      { name: "Friday", hours: oEntry.friday || 0, comment: oEntry.fridayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.friday) },
      { name: "Saturday", hours: oEntry.saturday || 0, comment: oEntry.saturdayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.saturday) },
      { name: "Sunday", hours: oEntry.sunday || 0, comment: oEntry.sundayTaskDetails || "No task details", date: that._formatDateForDisplay(oWeekDates.sunday) }
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
            alignItems: "Center",
            items: [
              new sap.m.VBox({
                items: [
                  new sap.m.Text({
                    text: oDay.name,
                    design: "Bold"
                  }).addStyleClass("tsDayName"),
                  new sap.m.Text({
                    text: oDay.date,
                    design: "Bold"
                  }).addStyleClass("tsDayDate")
                ]
              }),
              new sap.m.HBox({
                alignItems: "Center",
                items: [
                  new sap.m.Text({
                    text: "Hours:",
                    design: "Bold"
                  }).addStyleClass("tsHoursLabel"),
                  new sap.m.Text({
                    text: `${oDay.hours.toFixed(2)}`,
                    design: "Bold"
                  }).addStyleClass(getHoursColorClass(oDay.hours))
                ]
              })
            ]
          }).addStyleClass("tsDayHeader"),

          new sap.m.HBox({
            width: "100%",
            class: "sapUiTinyMarginTopBottom",
            items: [
              new sap.m.VBox({
                width: "100%",
                items: [
                  new sap.m.Text({
                    text: "Task Details:",
                    design: "Bold"
                  }).addStyleClass("tsTaskDetailsLabel"),
                  new sap.m.Text({
                    text: oDay.comment,
                    wrapping: true
                  }).addStyleClass("tsTaskDetails")
                ]
              })
            ]
          }),

          ...(index < aDays.length - 1 ? [
            new sap.m.HBox({
              height: "1px",
              class: "tsSeparator sapUiTinyMarginTopBottom"
            })
          ] : [])
        ]
      }).addStyleClass("tsDayCard");
    });

    // Create a dialog with a custom style class to match the image
    var oDialog = new sap.m.Dialog({
      title: "Week Task Details",
      contentWidth: "400px",  // adjusted width
      contentHeight: "70vh",  // max height of dialog
      stretchOnPhone: true,
      content: new sap.m.ScrollContainer({
        vertical: true,
        horizontal: false,
        height: "100%",
        content: new sap.m.VBox({
          items: aItems,
          class: "sapUiResponsiveMargin"
        })
      }),
      endButton: new sap.m.Button({
        text: "Close",
        press: function () { oDialog.close(); }
      }),
      afterClose: function () { oDialog.destroy(); }
    }).addStyleClass("tsTaskDetailDialog");

    // Add custom CSS styles to match the image exactly
    var sCustomCSS = `
      .tsTaskDetailDialog {
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .tsDayCard {
        background-color: #f8f9fa;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      
      .tsDayHeader {
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .tsDayName {
        font-size: 16px;
        color: #333333;
      }
      
      .tsDayDate {
        font-size: 14px;
        color: #666666;
      }
      
      .tsHoursLabel {
        font-size: 14px;
        color: #666666;
        margin-right: 5px;
      }
      
      .tsHoursRed {
        color: #e74c3c;
        font-size: 16px;
      }
      
      .tsHoursOrange {
        color: #f39c12;
        font-size: 16px;
      }
      
      .tsHoursGreen {
        color: #27ae60;
        font-size: 16px;
      }
      
      .tsTaskDetailsLabel {
        font-size: 14px;
        color: #666666;
        margin-bottom: 4px;
      }
      
      .tsTaskDetails {
        font-size: 14px;
        color: #333333;
        line-height: 1.4;
      }
      
      .tsSeparator {
        background-color: #e0e0e0;
        margin: 10px 0;
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

    // Helper function to format date for display
    _formatDateForDisplay: function (date) {
      if (!date) return "";
      var oDate = new Date(date);
      var options = { month: 'short', day: 'numeric', year: 'numeric' };
      return oDate.toLocaleDateString('en-US', options);
    },

    // Helper function to get week dates
    _getWeekDates: function () {
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

    // Initialize timesheet with week days
    _initializeTimesheet: function () {
      let oModel = this.getView().getModel();
      let currentWeekStart = new Date(oModel.getProperty("/currentWeekStart"));

      // 1️⃣ Generate week days
      let weekDays = [];
      for (let i = 0; i < 7; i++) {
        let date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        weekDays.push(this._formatDay(date));
      }
      oModel.setProperty("/weekDays", weekDays);

      // 2️⃣ Compute weekEnd
      let weekEnd = this._getWeekEnd(currentWeekStart);

      // 3️⃣ If an employee is already selected, load their data
      let selectedEmployee = oModel.getProperty("/selectedEmployee");

      if (selectedEmployee) {
        console.log("Loading timesheet for employee:", selectedEmployee);
        this._loadAdminTimesheetData(selectedEmployee, currentWeekStart, weekEnd);
      }
    },

    // Format day for display
    _formatDay: function (date) {
      var options = { month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    },

    // Get the start of the week (Monday)
    _getWeekStart: function (date) {
      var d = new Date(date);
      var day = d.getDay();
      var diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      return new Date(d.setDate(diff));
    },

    _loadAdminTimesheetData: function (employeeId, weekStart, weekEnd) {
      let oModel = this.getOwnerComponent().getModel("adminService");
      let that = this;
      let oViewModel = this.getView().getModel();

      // Show loading indicator
      BusyIndicator.show(0);

      // Normalize dates for comparison
      let normalizeDate = (date) => {
        if (!date) return "";
        return new Date(date).toISOString().split('T')[0];
      };

      let weekStartStr = normalizeDate(weekStart);
      let weekEndStr = normalizeDate(weekEnd);

      console.log("Loading timesheet data:", {
        employeeId,
        weekStart: weekStartStr,
        weekEnd: weekEndStr
      });

      // Create filters for employee and date range
      let aFilters = [
        new Filter("employeeEmpID", FilterOperator.EQ, employeeId),
        new Filter("weekStartDate", FilterOperator.LE, weekEndStr),
        new Filter("weekEndDate", FilterOperator.GE, weekStartStr)
      ];

      oModel.read("/Timesheets", {
        filters: aFilters,
        success: function (oData) {
          let allResults = oData.results || [];

          // Filter by employee and date range
          let employeeEntries = allResults.filter(item => {
            // Check if employee matches
            if (item.employeeEmpID !== employeeId) {
              return false;
            }

            // Check if the timesheet entry falls within the selected week
            let entryWeekStart = normalizeDate(item.weekStartDate);
            let entryWeekEnd = normalizeDate(item.weekEndDate);

            // Check if the entry's week overlaps with the selected week
            return entryWeekStart <= weekEndStr && entryWeekEnd >= weekStartStr;
          });

          console.log("Filtered entries:", employeeEntries);

          // Format table structure
          let formatted = that._formatAdminTimesheet(employeeEntries);

          // Bind table data
          oViewModel.setProperty("/timesheetEntries", formatted);

          // Weekly total
          let totalWeekHours = formatted.reduce((sum, row) => sum + row.totalHours, 0);
          oViewModel.setProperty("/totalWeekHours", totalWeekHours);

          console.log("Filtered Week Data", formatted);

          // Hide loading indicator
          BusyIndicator.hide();
        },
        error: function (oError) {
          console.error("Error loading timesheet data:", oError);
          MessageToast.show("Error loading timesheet data");
          BusyIndicator.hide();
        }
      });
    },

    _formatAdminTimesheet: function (entries) {
      return entries.map(item => {
        // Choose correct name
        let finalProjectName =
          item.projectName && item.projectName.trim() !== ""
            ? item.projectName
            : (item.nonProjectTypeName || "Non-Project");

        // Convert hours to number (avoid strings like "7.00")
        const num = v => (v ? parseFloat(v) : 0);

        return {
          project: finalProjectName,
          task: item.task || "",
          taskDetails: item.taskDetails || "",
          mondayTaskDetails: item.mondayTaskDetails || "",
          tuesdayTaskDetails: item.tuesdayTaskDetails || "",
          wednesdayTaskDetails: item.wednesdayTaskDetails || "",
          thursdayTaskDetails: item.thursdayTaskDetails || "",
          fridayTaskDetails: item.fridayTaskDetails || "",
          saturdayTaskDetails: item.saturdayTaskDetails || "",
          sundayTaskDetails: item.sundayTaskDetails || "",

          monday: num(item.mondayHours),
          tuesday: num(item.tuesdayHours),
          wednesday: num(item.wednesdayHours),
          thursday: num(item.thursdayHours),
          friday: num(item.fridayHours),
          saturday: num(item.saturdayHours),
          sunday: num(item.sundayHours),

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

    // Load timesheet entries from backend
    _loadTimesheetEntriesFromBackend: function (employeeId) {
      var oModel = this.getView().getModel();
      var that = this;
      var currentWeekStart = oModel.getProperty("/currentWeekStart");

      // Format dates for OData query
      var weekStartStr = this._formatDateForOData(currentWeekStart);
      var weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      var weekEndStr = this._formatDateForOData(weekEnd);

      // Query timesheet entries for the employee and week
      var oDataModel = this.getOwnerComponent().getModel("adminService");
      var aFilters = [
        new Filter("employeeID", FilterOperator.EQ, employeeId),
        new Filter("date", FilterOperator.BT, weekStartStr, weekEndStr)
      ];

      oDataModel.read("/Timesheets", {
        filters: aFilters,
        success: function (oData) {
          var aTimesheets = oData.results || [];
          var aEmployeeProjects = oModel.getProperty("/employeeProjects") || [];
          var aTimesheetEntries = [];

          // Create a map of existing timesheet entries by project
          var timesheetMap = {};
          aTimesheets.forEach(function (timesheet) {
            var projectId = timesheet.projectID;
            if (!timesheetMap[projectId]) {
              timesheetMap[projectId] = {
                projectId: projectId,
                project: timesheet.projectName || "",
                task: timesheet.task || "General",
                taskDetails: timesheet.taskDetails || "",
                monday: "0.00",
                tuesday: "0.00",
                wednesday: "0.00",
                thursday: "0.00",
                friday: "0.00",
                saturday: "0.00",
                sunday: "0.00",
                totalHours: "0.00"
              };
            }

            // Add hours for the specific day
            var date = new Date(timesheet.date);
            var dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            var dayName = that._getDayName(dayOfWeek);

            if (dayName && timesheet.hours) {
              timesheetMap[projectId][dayName] = parseFloat(timesheet.hours).toFixed(2);
            }
          });

          // Calculate total hours for each project
          Object.keys(timesheetMap).forEach(function (projectId) {
            var entry = timesheetMap[projectId];
            var totalHours = 0;
            var days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

            for (var i = 0; i < days.length; i++) {
              var hours = parseFloat(entry[days[i]]) || 0;
              totalHours += hours;
            }

            entry.totalHours = totalHours.toFixed(2);
            aTimesheetEntries.push(entry);
          });

          // Add entries for projects that don't have timesheet data yet
          aEmployeeProjects.forEach(function (project) {
            if (!timesheetMap[project.projectId]) {
              aTimesheetEntries.push({
                projectId: project.projectId,
                project: project.name,
                task: "General",
                taskDetails: "Work on " + project.name,
                monday: "0.00",
                tuesday: "0.00",
                wednesday: "0.00",
                thursday: "0.00",
                friday: "0.00",
                saturday: "0.00",
                sunday: "0.00",
                totalHours: "0.00"
              });
            }
          });

          oModel.setProperty("/timesheetEntries", aTimesheetEntries);
        },
        error: function (oError) {
          console.error("Error loading timesheet entries:", oError);
          MessageToast.show("Error loading timesheet data");

          // Fallback to creating empty entries if backend fails
          var aEmployeeProjects = oModel.getProperty("/employeeProjects") || [];
          var aTimesheetEntries = [];

          aEmployeeProjects.forEach(function (project) {
            aTimesheetEntries.push({
              projectId: project.projectId,
              project: project.name,
              task: "General",
              taskDetails: "Work on " + project.name,
              monday: "0.00",
              tuesday: "0.00",
              wednesday: "0.00",
              thursday: "0.00",
              friday: "0.00",
              saturday: "0.00",
              sunday: "0.00",
              totalHours: "0.00"
            });
          });

          oModel.setProperty("/timesheetEntries", aTimesheetEntries);
        }
      });
    },

    // Format date for OData query
    _formatDateForOData: function (date) {
      var month = (date.getMonth() + 1).toString().padStart(2, '0');
      var day = date.getDate().toString().padStart(2, '0');
      return date.getFullYear() + "-" + month + "-" + day;
    },

    // Get day name from day number
    _getDayName: function (dayNumber) {
      // Convert day number (0=Sunday, 1=Monday, etc.) to property name
      switch (dayNumber) {
        case 1: return "monday";
        case 2: return "tuesday";
        case 3: return "wednesday";
        case 4: return "thursday";
        case 5: return "friday";
        case 6: return "saturday";
        case 0: return "sunday";
        default: return null;
      }
    },

    // Load projects assigned to a specific employee
    _loadEmployeeProjects: function (employeeId) {
      var oModel = this.getView().getModel();
      var allProjects = oModel.getProperty("/projects") || [];

      // Filter projects where the employee is the project owner or team member
      var employeeProjects = allProjects.filter(function (project) {
        return project.managerId === employeeId ||
          (project.teamMembers && project.teamMembers.includes(employeeId));
      });

      oModel.setProperty("/employeeProjects", employeeProjects);
    },

    // Handle employee selection change - Updated to handle Enter key
    onEmployeeChange: function (oEvent) {
  let oViewModel = this.getView().getModel();

  // 1️ get selected employee id
  let employeeId = oEvent.getParameter("selectedItem") ?
    oEvent.getParameter("selectedItem").getKey() :
    oEvent.getSource().getSelectedKey();

  // 2️store selected employee in model and localStorage
  oViewModel.setProperty("/selectedEmployee", employeeId);
  localStorage.setItem("selectedEmployeeId", employeeId); // Store for persistence

  // 3️⃣ Update the employee list selection
  var oEmployeeList = this.byId("employeeList");
  if (oEmployeeList) {
    var aItems = oEmployeeList.getItems();
    for (var i = 0; i < aItems.length; i++) {
      var oItem = aItems[i];
      var oContext = oItem.getBindingContext();
      if (oContext && oContext.getProperty("userId") === employeeId) {
        oEmployeeList.setSelectedItem(oItem);
        break;
      }
    }
  }

  let weekStart = oViewModel.getProperty("/currentWeekStart");

  // 5️⃣ Compute week end (weekStart + 6 days)
  let weekEnd = this._getWeekEnd(weekStart);
  // 3️⃣ clear old rows
  oViewModel.setProperty("/timesheetEntries", []);
  oViewModel.setProperty("/totalWeekHours", 0);

  this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
},

    _getWeekEnd: function (weekStart) {
      let end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      return end;
    },

    // Handle hours input change - Updated to match the first image
    // Handle hours input change - Updated to match the first image with non-editable fields
    onHourButtonPress: function (oEvent) {
      try {
        var oButton = oEvent.getSource();
        var oBindingContext = oButton.getBindingContext();

        if (!oBindingContext) {
          sap.m.MessageToast.show("Unable to get binding context");
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
            sap.m.MessageToast.show("Unable to determine day");
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
            aHourOptions.push(new sap.ui.core.Item({
              key: i.toString(),
              text: i + " hour" + (i !== 1 ? "s" : "")
            }));
          }

          this._oHourEditDialog = new sap.m.Dialog({
            title: "Edit " + this._capitalize(sDay) + " Entry",
            contentWidth: "350px",
            titleAlignment: "Center",
            content: [
              new sap.m.VBox({
                items: [
                  // Date Field - NON-EDITABLE
                  new sap.m.VBox({
                    items: [
                      new sap.m.Label({
                        text: "Date:",
                        design: "Bold"
                      }).addStyleClass("sapUiTinyMarginBottom"),
                      new sap.m.Input({
                        value: "{/editData/date}",
                        editable: false
                      })
                    ]
                  }).addStyleClass("sapUiTinyMarginBottom"),

                  // Project Field - NON-EDITABLE
                  new sap.m.VBox({
                    items: [
                      new sap.m.Label({
                        text: "Project:",
                        design: "Bold"
                      }).addStyleClass("sapUiTinyMarginBottom"),
                      new sap.m.Input({
                        value: "{/editData/projectName}",
                        editable: false
                      })
                    ]
                  }).addStyleClass("sapUiTinyMarginBottom"),

                  // Task Type Field - NON-EDITABLE
                  new sap.m.VBox({
                    items: [
                      new sap.m.Label({
                        text: "Task",
                        design: "Bold"
                      }).addStyleClass("sapUiTinyMarginBottom"),
                      new sap.m.Input({
                        value: "{/editData/taskType}",
                        editable: false
                      })
                    ]
                  }).addStyleClass("sapUiTinyMarginBottom"),

                  // Hours Field - NON-EDITABLE
                  new sap.m.VBox({
                    items: [
                      new sap.m.Label({
                        text: "Hours:",
                        design: "Bold",
                        required: true
                      }).addStyleClass("sapUiTinyMarginBottom"),
                      new sap.m.Input({
                        value: "{/editData/hours}",
                        editable: false
                      })
                    ]
                  }).addStyleClass("sapUiTinyMarginBottom"),

                  // Task Details Field - NON-EDITABLE
                  new sap.m.VBox({
                    items: [
                      new sap.m.Label({
                        text: "Task Details:",
                        design: "Bold"
                      }).addStyleClass("sapUiTinyMarginBottom"),
                      new sap.m.TextArea({
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
            beginButton: new sap.m.Button({
              text: "Close",
              type: "Emphasized",
              press: function () {
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
          var oCurrentProject = aProjects.find(function (project) {
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
        var oEditModel = new sap.ui.model.json.JSONModel({
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
        sap.m.MessageToast.show("Error opening edit dialog");
      }
    },

    // Helper function to validate hours input
    _validateHours: function (oEvent) {
      var sValue = oEvent.getSource().getValue();
      var oDialogModel = this._oHourEditDialog.getModel();
      var oEditData = oDialogModel.getProperty("/editData");

      // Validate hours
      if (sValue === "" || sValue === null || sValue === undefined) {
        oEditData.hoursState = "Error";
      } else {
        var fHours = parseFloat(sValue);
        if (isNaN(fHours) || fHours < 0 || fHours > 24) {
          oEditData.hoursState = "Error";
        } else {
          oEditData.hoursState = "None";
        }
      }

      oDialogModel.setProperty("/editData", oEditData);
    },

    // Helper function to save the hour entry - Updated to save day-specific task details
    _saveHourEntry: function () {
      try {
        var oDialogModel = this._oHourEditDialog.getModel();
        var oEditData = oDialogModel.getProperty("/editData");

        // Validate hours
        if (oEditData.hoursState === "Error" || !oEditData.hours || isNaN(oEditData.hours)) {
          sap.m.MessageToast.show("Please enter valid hours between 0 and 24");
          return;
        }

        var fHours = parseFloat(oEditData.hours);
        if (fHours < 0 || fHours > 24) {
          sap.m.MessageToast.show("Hours must be between 0 and 24");
          return;
        }

        // Update the main model
        var oMainModel = this.getView().getModel();
        var aTimesheetEntries = oMainModel.getProperty("/timesheetEntries");

        // Find the entry to update
        var oEntryToUpdate = aTimesheetEntries[oEditData.entryIndex];
        if (!oEntryToUpdate) {
          sap.m.MessageToast.show("Error: Entry not found");
          return;
        }

        // Update the specific day's hours
        oEntryToUpdate[oEditData.day] = fHours;

        // Update day-specific task details
        var sDayTaskDetailsField = oEditData.day + "TaskDetails";
        oEntryToUpdate[sDayTaskDetailsField] = oEditData.taskDetails;

        // Update other fields
        oEntryToUpdate.task = oEditData.taskType;
        oEntryToUpdate.taskDetails = oEditData.taskDetails;

        // Recalculate total hours
        var totalHours = 0;
        var days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

        for (var i = 0; i < days.length; i++) {
          var hours = parseFloat(oEntryToUpdate[days[i]]) || 0;
          totalHours += hours;
        }

        oEntryToUpdate.totalHours = totalHours.toFixed(2);

        // Update the main model
        oMainModel.setProperty("/timesheetEntries", aTimesheetEntries);

        sap.m.MessageToast.show(oEditData.dayName + " entry updated successfully");

        // Close dialog
        this._oHourEditDialog.close();

        // Optional: Trigger backend save
        this._saveTimesheetToBackend();

      } catch (oError) {
        console.error("Error saving hour entry:", oError);
        sap.m.MessageToast.show("Error saving entry");
      }
    },

    // Helper function to capitalize first letter
    _capitalize: function (sString) {
      if (!sString) return "";
      return sString.charAt(0).toUpperCase() + sString.slice(1);
    },

    // Helper function to get day index
    _getDayIndex: function (sDay) {
      var dayMap = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6
      };
      return dayMap[sDay] || 0;
    },

    // Helper function to get display name for day
    _getDayDisplayName: function (sDay) {
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

    // Helper function for default dates
    _getDefaultDate: function (iIndex) {
      var defaultDates = ["Nov 17", "Nov 18", "Nov 19", "Nov 20", "Nov 21", "Nov 22", "Nov 23"];
      return defaultDates[iIndex] || "Unknown Date";
    },

    // Navigate to previous week
    onPreviousWeek: function () {
      let oModel = this.getView().getModel();

      // 1️⃣ Get current week start
      let currentWeekStart = new Date(oModel.getProperty("/currentWeekStart"));

      if (isNaN(currentWeekStart)) {
        console.error("Invalid week start:", oModel.getProperty("/currentWeekStart"));
        return;
      }

      // 2️⃣ Move week start back by 7 days
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);

      // 3️⃣ Save the updated week start
      oModel.setProperty("/currentWeekStart", currentWeekStart);

      // Update the selectedDate in the DatePicker to match the week start
      oModel.setProperty("/selectedDate", currentWeekStart);

      // 4️⃣ Compute clean weekStart & weekEnd
      let weekStart = new Date(currentWeekStart);
      let weekEnd = this._getWeekEnd(weekStart);

      // 5️⃣ Update week days UI
      this._updateWeekDays(weekStart);

      // 6️⃣ Load Timesheet Records for this week
      let employeeId = oModel.getProperty("/selectedEmployee");
      if (employeeId) {
        this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
      }
    },

    // Navigate to current week
    onCurrentWeek: function () {
      let oModel = this.getView().getModel();

      let weekStart = this._getWeekStart(new Date());
      oModel.setProperty("/currentWeekStart", weekStart);

      // Update the selectedDate in the DatePicker to match the current week
      oModel.setProperty("/selectedDate", weekStart);

      let weekEnd = this._getWeekEnd(weekStart);
      this._updateWeekDays(weekStart);

      let employeeId = oModel.getProperty("/selectedEmployee");
      if (employeeId) {
        this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
      }
    },

    onNextWeek: function () {
      let oModel = this.getView().getModel();

      // 1️⃣ Get current week start
      let currentWeekStart = new Date(oModel.getProperty("/currentWeekStart"));

      if (isNaN(currentWeekStart)) {
        console.error("Invalid week start:", oModel.getProperty("/currentWeekStart"));
        return;
      }

      // 2️⃣ Move week start back by 7 days
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);

      // 3️⃣ Save the updated week start
      oModel.setProperty("/currentWeekStart", currentWeekStart);

      // Update the selectedDate in the DatePicker to match the week start
      oModel.setProperty("/selectedDate", currentWeekStart);

      // 4️⃣ Compute clean weekStart & weekEnd
      let weekStart = new Date(currentWeekStart);
      let weekEnd = this._getWeekEnd(weekStart);

      // 5️⃣ Update week days UI
      this._updateWeekDays(weekStart);

      let employeeId = oModel.getProperty("/selectedEmployee");
      if (employeeId) {
        this._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
      }
    },

    // CORRECTED: DatePicker change function with proper week filtering
    onDatePickerChange: function (oEvent) {
      BusyIndicator.show(0);

      let selectedDate = oEvent.getParameter("value");
      if (!selectedDate) {
        BusyIndicator.hide();
        return;
      }

      // Parse the date string to a Date object
      let dateValue = new Date(selectedDate);
      if (isNaN(dateValue.getTime())) {
        BusyIndicator.hide();
        return;
      }

      let oModel = this.getView().getModel();

      // Calculate Monday (start of week)
      let weekStart = this._getWeekStart(dateValue);

      // Save weekStart in model
      oModel.setProperty("/currentWeekStart", weekStart);

      // Also update the selectedDate to maintain the DatePicker value
      oModel.setProperty("/selectedDate", dateValue);

      // Update week days label UI
      this._updateWeekDays(weekStart);

      // Compute week end
      let weekEnd = this._getWeekEnd(weekStart);

      console.log("DatePicker changed:", {
        selectedDate: selectedDate,
        dateValue: dateValue,
        weekStart: weekStart,
        weekEnd: weekEnd,
        formattedWeekStart: this._formatDateForOData(weekStart),
        formattedWeekEnd: this._formatDateForOData(weekEnd)
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

    _updateWeekDays: function (weekStart) {
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

    // Record time - Save timesheet to backend
    onRecordTime: function () {
      var oModel = this.getView().getModel();
      var selectedEmployee = oModel.getProperty("/selectedEmployee");
      var timesheetEntries = oModel.getProperty("/timesheetEntries");
      var currentWeekStart = oModel.getProperty("/currentWeekStart");

      if (!selectedEmployee) {
        MessageToast.show("Please select an employee first");
        return;
      }

      // Save timesheet data to backend
      this._saveTimesheetToBackend(selectedEmployee, timesheetEntries, currentWeekStart);
    },

    // Save timesheet data to backend
    _saveTimesheetToBackend: function (employeeId, timesheetEntries, weekStart) {
      var oDataModel = this.getOwnerComponent().getModel("adminService");
      var that = this;

      // First, delete existing timesheet entries for this employee and week
      var weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      var weekStartStr = this._formatDateForOData(weekStart);
      var weekEndStr = this._formatDateForOData(weekEnd);

      var aFilters = [
        new Filter("employeeID", FilterOperator.EQ, employeeId),
        new Filter("date", FilterOperator.BT, weekStartStr, weekEndStr)
      ];

      // Read existing entries to delete them
      oDataModel.read("/Timesheets", {
        filters: aFilters,
        success: function (oData) {
          var aExistingEntries = oData.results || [];
          var deletePromises = [];

          // Delete existing entries
          aExistingEntries.forEach(function (entry) {
            var deletePromise = new Promise(function (resolve, reject) {
              oDataModel.remove("/Timesheets('" + entry.ID + "')", {
                success: resolve,
                error: reject
              });
            });
            deletePromises.push(deletePromise);
          });

          // After all deletions are complete, create new entries
          Promise.all(deletePromises).then(function () {
            var createPromises = [];
            var days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

            // Create new timesheet entries
            timesheetEntries.forEach(function (entry) {
              days.forEach(function (day, index) {
                var hours = parseFloat(entry[day]) || 0;
                if (hours > 0) {
                  var date = new Date(weekStart);
                  date.setDate(date.getDate() + index);

                  var timesheetData = {
                    employeeID: employeeId,
                    projectID: entry.projectId,
                    projectName: entry.project,
                    task: entry.task,
                    taskDetails: entry[day + "TaskDetails"] || entry.taskDetails || "",
                    date: that._formatDateForOData(date),
                    hours: hours,
                    weekStartDate: weekStartStr,
                    weekEndDate: weekEndStr
                  };

                  var createPromise = new Promise(function (resolve, reject) {
                    oDataModel.create("/Timesheets", timesheetData, {
                      success: resolve,
                      error: reject
                    });
                  });
                  createPromises.push(createPromise);
                }
              });
            });

            // Wait for all creations to complete
            Promise.all(createPromises).then(function () {
              MessageToast.show("Timesheet recorded successfully for employee: " + employeeId);
              // Reload timesheet data to reflect changes
              that._loadAdminTimesheetData(employeeId, weekStart, weekEnd);
            }).catch(function (error) {
              console.error("Error creating timesheet entries:", error);
              MessageToast.show("Error saving some timesheet entries");
            });
          }).catch(function (error) {
            console.error("Error deleting existing timesheet entries:", error);
            MessageToast.show("Error updating timesheet entries");
          });
        },
        error: function (oError) {
          console.error("Error reading existing timesheet entries:", oError);
          MessageToast.show("Error updating timesheet entries");
        }
      });
    },

    // Helper function to generate valid UUID
    _generateUUID: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // Load Employees from OData service
    _loadEmployees: function () {
      var oModel = this.getOwnerComponent().getModel("adminService");
      var that = this;

      oModel.read("/Employees", {
        success: function (oData) {
          var aEmployees = oData.value || oData.results || [];
          console.log("Raw Employees Data from OData:", aEmployees);

          var aFormattedUsers = that._formatEmployeeData(aEmployees);

          var allowedRoles = ["Employee", "Manager"];

          var aEmployeeOnly = aFormattedUsers.filter(user =>
            allowedRoles.includes(user.roleName)
          );

          var oViewModel = that.getView().getModel();
          oViewModel.setProperty("/users", aEmployeeOnly);
          if (aFormattedUsers.length > 0) {
            // Check if we have a stored employee ID
            let storedEmployeeId = localStorage.getItem("selectedEmployeeId");
            let defaultEmployeeId = storedEmployeeId || aFormattedUsers[0].userId;
            oViewModel.setProperty("/selectedEmployee", defaultEmployeeId);

            // Load timesheet for this employee immediately
            let weekStart = oViewModel.getProperty("/currentWeekStart");
            let weekEnd = that._getWeekEnd(weekStart);
            that._loadAdminTimesheetData(defaultEmployeeId, weekStart, weekEnd);
          }

          oViewModel.refresh(true);
          that._refreshAnalyticsData();

          MessageToast.show("Employees loaded successfully: " + aFormattedUsers.length + " users");
        },
        error: function (oError) {
          console.error("Error loading employees:", oError);
          MessageToast.show("Error loading employees data");
        }
      });
    },


    // Load Projects from OData service
    _loadProjects: function () {
      var oModel = this.getOwnerComponent().getModel("adminService");
      var that = this;

      oModel.read("/Projects", {
        success: function (oData) {
          var aProjects = oData.value || oData.results || [];
          console.log("Raw Projects Data from OData:", aProjects);

          var aFormattedProjects = that._formatProjectData(aProjects);
          console.log("Formatted Projects for UI:", aFormattedProjects);

          var oViewModel = that.getView().getModel();
          oViewModel.setProperty("/projects", aFormattedProjects);
          oViewModel.refresh(true); // Force refresh to update table
          that._refreshAnalyticsData();

          MessageToast.show("Projects loaded successfully: " + aFormattedProjects.length + " projects");
        },
        error: function (oError) {
          console.error("Error loading projects:", oError);
          MessageToast.show("Error loading projects data");
        }
      });
    },

    // Format employee data from OData to UI model
    _formatEmployeeData: function (aEmployees) {

    // First pass: Normalize all user records
    let aFormattedUsers = aEmployees.map(function (employee) {

        // ----- ROLE MAPPING -----
        let role =
            employee.roleName ||
            employee.Role ||
            employee.role ||
            employee.accessLevel ||
            "Employee";

        // Normalize role text
        role = role.toLowerCase().includes("admin")
            ? "Admin"
            : role.toLowerCase().includes("manager")
                ? "Manager"
                : "Employee";

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

    // ----- SECOND PASS: FIX MANAGER NAMES -----
    aFormattedUsers.forEach(function (user) {
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


    // Format project data from OData to UI model
    // Update the _formatProjectData function in Admin.controller.js:

   _formatProjectData: function (aProjects) {
    var oViewModel = this.getView().getModel();
    var aUsers = oViewModel.getProperty("/users") || [];

    return aProjects.map(project => {
        console.log("Processing project:", project);

        // Extract numeric values safely
        var budget = Number(project.budget) || 0;
        var allocatedHours = Number(project.allocatedHours) || 0;
        var usedHours = Number(project.usedHours) || 0;

        // Backend CUID field
        var managerId = project.projectOwner_ID || project.managerId || ""
        var managerName = project.projectOwnerName || null
        var formattedProject = {
            projectId: project.projectID || project.ID,
            name: project.projectName || project.name || "Unknown Project",
            description: project.description || "",
            managerId,
            managerName,
            budget,
            allocatedHours,
            usedHours,
            startDate: project.startDate
                ? new Date(project.startDate).toISOString().split("T")[0]
                : null,
            endDate: project.endDate
                ? new Date(project.endDate).toISOString().split("T")[0]
                : null,
            status: project.status || "Active",
            client: project.client || "Internal",
            isBillable: project.isBillable !== undefined ? project.isBillable : true,
            teamMembers: []
        };

        console.log("Formatted project:", formattedProject);
        return formattedProject;
    });
},

    // User Management Functions
    onAddUser: function () {
      this._loadUserDialog("create");
    },

    onEditUser: function (oEvent) {
      var oSelectedUser = oEvent.getSource().getBindingContext().getObject();
      this._loadUserDialog("edit", oSelectedUser);
    },

    onToggleUserStatus: function (oEvent) {
      var oSelectedUser = oEvent.getSource().getBindingContext().getObject();
      var oModel = this.getView().getModel();
      var aUsers = oModel.getProperty("/users");

      var oUser = aUsers.find(user => user.userId === oSelectedUser.userId);
      if (oUser) {
        oUser.status = oUser.status === "Active" ? "Inactive" : "Active";
        oModel.setProperty("/users", aUsers);
        oModel.refresh(true); // Force refresh to update table

        // Update in OData service
        this._updateEmployeeInOData(oUser, false);
      }
    },

   _loadUserDialog: async function (sMode, oUserData) {

    const managerList = await this._loadAvailableManagers();

    const oViewModel = new JSONModel({
        mode: sMode,
        userData: oUserData ? JSON.parse(JSON.stringify(oUserData)) : {
            firstName: "",
            lastName: "",
            email: "",
            role: "",
            managerId: "",
            managerName: "",
            status: "Active"
        },
        availableManagers: managerList
    });

    if (!this._oUserDialog) {
        this._oUserDialog = new Dialog({
            title: sMode === "create" ? "Create New User" : "Edit User",
            contentWidth: "500px",
            content: [
                new SimpleForm({
                    layout: "ResponsiveGridLayout",
                    editable: true,
                    content: [
                        new Label({ text: "First Name" }),
                        new Input({ value: "{/userData/firstName}", required: true, placeholder: "Enter First Name" }),

                        new Label({ text: "Last Name" }),
                        new Input({ value: "{/userData/lastName}", required: true, placeholder: "Enter Last Name" }),

                        new Label({ text: "Email" }),
                        new Input({ value: "{/userData/email}", type: "Email", required: true, placeholder: "Enter Email" }),

                        new Label({ text: "Role" }),
                        new Select({
                            selectedKey: "{/userData/role}",
                            placeholder: "Select Role",
                            forceSelection: false,
                            items: [
                                new Item({ key: "Employee", text: "Employee" }),
                                new Item({ key: "Manager", text: "Manager" }),
                                new Item({ key: "Admin", text: "Admin" })
                            ]
                        }),

                        new Label({ text: "Manager" }),
                        new Select({
                            selectedKey: "{/userData/managerId}",
                            forceSelection: false,
                            items: {
                                path: "/availableManagers",
                                template: new Item({
                                    key: "{ID}",
                                    text: "{firstName} {lastName}"
                                })
                            },
                            showSecondaryValues: true,
                            change: function (oEvent) {
                               const oItem = oEvent.getSource().getSelectedItem();
        if (!oItem) return; // chill if nothing selected

        const oDialog = this.getParent().getParent().getParent();
        const oVM = oDialog.getModel();

        const data = oItem.getBindingContext().getObject();

        oVM.setProperty("/userData/managerId", data.ID);
        oVM.setProperty("/userData/managerName",
            data.firstName + " " + data.lastName
        );
                            }
                        }),

                        new Label({ text: "Status" }),
                        new Select({
                            selectedKey: "{/userData/status}",
                            items: [
                                new Item({ key: "Active", text: "Active" }),
                                new Item({ key: "Inactive", text: "Inactive" })
                            ]
                        })
                    ]
                })
            ],
            beginButton: new Button({
                text: "Save",
                press: this.onSaveUser.bind(this)
            }),
            endButton: new Button({
                text: "Cancel",
                press: this.onCancelUser.bind(this)
            })
        });

        this.getView().addDependent(this._oUserDialog);
    }

    this._oUserDialog.setModel(oViewModel);
    this._oUserDialog.open();
},
_loadAvailableManagers: function () {
    return new Promise((resolve, reject) => {
        const oModel = this.getOwnerComponent().getModel("adminService");

        oModel.read("/AvailableManagers", {
            success: function (oData) {
                // Handle both OData V2 and CAP response formats
                const list = 
                    oData.results ||   // V2
                    oData.value   ||   // CAP
                    [];

                resolve(list);
            },
            error: function (err) {
                console.error("Failed loading managers", err);
                reject(err);
            }
        });
    });
},
_getManagersList: function () {
  var oModel = this.getView().getModel();
  var aUsers = oModel.getProperty("/users");

  return aUsers
    .filter(user => user.role === "Manager" && user.status === "Active")
    .map(m => ({
        ID: m.backendId,     // GUID (match managerId)
        firstName: m.firstName,
        lastName: m.lastName
    }));
},

    // Update local model immediately with correct role and manager name
   onSaveUser: function () {
      var oDialog = this._oUserDialog;
      var oViewModel = oDialog.getModel();
      var oUserData = JSON.parse(JSON.stringify(oViewModel.getProperty("/userData")));
      var sMode = oViewModel.getProperty("/mode");

      // Validate required fields
      if (!oUserData.firstName || !oUserData.lastName || !oUserData.email) {
        MessageToast.show("Please fill in all required fields");
        return;
      }

      // Validate email format
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(oUserData.email)) {
        MessageToast.show("Please enter a valid email address");
        return;
      }

      // Check for duplicate email (excluding current user in edit mode)
      var oModel = this.getView().getModel();
      var aUsers = oModel.getProperty("/users").slice();
      var bEmailExists = aUsers.some(user =>
        user.email === oUserData.email &&
        (sMode === "create" || user.userId !== oUserData.userId)
      );
      if (bEmailExists) {
        MessageToast.show("Email address already exists");
        return;
      }

      // Update local model immediately with correct role and manager name
      if (sMode === "edit") {
        var aUsers = oModel.getProperty("/users");
        var iIndex = aUsers.findIndex(user => user.userId === oUserData.userId);
        if (iIndex !== -1) {
          // Update the user in the local model with ALL fields including role
          aUsers[iIndex] = {
            ...aUsers[iIndex],
            firstName: oUserData.firstName,
            lastName: oUserData.lastName,
            email: oUserData.email,
            role: oUserData.role, // This was missing - now role updates immediately
            roleName: oUserData.roleName, // Add roleName field for backend compatibility
            managerId: oUserData.managerId,
            status: oUserData.status
          };

          // Update manager name if managerId changed or is set
         let managerList = oViewModel.getProperty("/availableManagers");

if (!oUserData.managerId && oUserData.managerName) {
    let manager = managerList.find(m =>
        (m.firstName + " " + m.lastName).trim() === oUserData.managerName.trim()
    );

    if (manager) {
        oUserData.managerId = manager.ID; 
    }
}

          oModel.setProperty("/users", aUsers);
          oModel.refresh(true); // Force refresh to update table
          MessageToast.show("User updated successfully in UI");
        }
      } else if (sMode === "create") {
        // For new users, add to local model temporarily
        // Set manager name for new user
       // Get full manager object from availableManagers
        MessageToast.show("User added successfully in UI");
      }

      // Then update in OData service WITHOUT automatic refresh
      if (sMode === "create") {
        this._createEmployeeInOData(oUserData, false); // Don't refresh after create
      } else {
        this._updateEmployeeInOData(oUserData, false); // Don't refresh after update
      }

      oDialog.close();
    },


    // Create employee in OData service
    _createEmployeeInOData: function (oUserData, bRefresh = true) {
    var oModel = this.getOwnerComponent().getModel("adminService");
    var that = this;

    var oEmployeeData = {
        firstName: oUserData.firstName,
        lastName: oUserData.lastName,
        email: oUserData.email,
        roleName: oUserData.role,
        managerID_ID: oUserData.managerId || null,
        isActive: oUserData.status === "Active"
    };

    console.log("Creating employee with payload:", oEmployeeData);

    oModel.create("/Employees", oEmployeeData, {
        success: function (oData) {
            MessageToast.show("User created successfully");

            // 🧠 Add new employee instantly in UI without refresh
            let oViewModel = that.getView().getModel();
            let aUsers = oViewModel.getProperty("/users") || [];

            // Backend returns new ID
            const backendId = oData.ID;

            // 🔍 Find manager for name resolution
            const manager = aUsers.find(u => u.backendId === oEmployeeData.managerID_ID);

            // New UI entry
            const newUser = {
                backendId: backendId,
                userId: oData.employeeID || backendId, // fallback
                firstName: oEmployeeData.firstName,
                lastName: oEmployeeData.lastName,
                email: oEmployeeData.email,
                role: oEmployeeData.roleName,
                roleName: oEmployeeData.roleName,
                managerId: oEmployeeData.managerID_ID,
                managerName: manager ? manager.firstName + " " + manager.lastName : "",
                status: oEmployeeData.isActive ? "Active" : "Inactive"
            };

            // 💥 Push only ONCE into UI model
            aUsers.push(newUser);
            oViewModel.setProperty("/users", aUsers);

            // Optional backend reload
            // if (bRefresh) {
            //     that._loadEmployees();
            // }
        },
        error: function (error) {
            console.error("Create failed:", error);
            MessageToast.show("Error creating user");
        }
    });
},


    // Update employee in OData service with comprehensive field mapping and optional refresh
   _updateEmployeeInOData: function (oUserData, bRefresh = true) {
  var oModel = this.getOwnerComponent().getModel("adminService");
  var that = this;

  // Step 1: Get Role ID
  this._getUserRoleIdByName(oUserData.role)
    .then(function (roleGuid) {

      // Step 2: Get Manager EmployeeID
      return that._getManagerEmployeeId(oUserData.managerId)
        .then(function (managerEmployeeId) {

          // Step 3: Read backend Employees
          oModel.read("/Employees", {
            success: function (oData) {
              var oMatch = oData.results.find(emp => emp.employeeID === oUserData.userId);
              if (!oMatch) {
                MessageToast.show("Employee not found.");
                return;
              }

              var backendId = oMatch.ID;

              // Step 4: Build Final Payload
              var oEmployeePayload = {
                firstName: oUserData.firstName,
                lastName: oUserData.lastName,
                email: oUserData.email,
                userRole_ID: roleGuid,
                managerID_ID: managerEmployeeId,   // <-- EMPLOYEE ID from AvailableManagers
                managerName: oUserData.managerName,
                isActive: oUserData.status === "Active"
              };

              var sPath = "/Employees('" + backendId + "')";

              // Step 5: Update backend
              oModel.update(sPath, oEmployeePayload, {
                success: function () {

  MessageToast.show("User updated successfully.");

  // Update UI instantly (NO REFRESH)
  var oViewModel = that.getView().getModel();
  var aUsers = oViewModel.getProperty("/users");

  let idx = aUsers.findIndex(u => u.userId === oUserData.userId);
  if (idx !== -1) {

    aUsers[idx].firstName = oUserData.firstName;
    aUsers[idx].lastName = oUserData.lastName;
    aUsers[idx].email = oUserData.email;

    aUsers[idx].role = oUserData.role;
    aUsers[idx].roleName = oUserData.role;

    // Update manager details
    aUsers[idx].managerId = oUserData.managerId;
    aUsers[idx].managerName = oUserData.managerName;

    aUsers[idx].status = oUserData.status;

    aUsers[idx].backendId = backendId;
  }

  oViewModel.setProperty("/users", aUsers);

}

              });
            }
          });
        });
    });
},

_getUserRoleIdByName: function (roleName) {
  return new Promise((resolve, reject) => {
    var oModel = this.getOwnerComponent().getModel("adminService");

    oModel.read("/UserRoles", {
      success: function (oData) {
        if (!oData.results) return reject("No UserRoles found");

        let match = oData.results.find(r => r.roleName === roleName);

        if (!match) return reject("Role not found: " + roleName);

        resolve(match.ID); // return GUID for userRole_ID
      },
      error: reject
    });
  });
},

_getManagerEmployeeId: function (managerGuid) {
  return new Promise((resolve, reject) => {
    var oModel = this.getOwnerComponent().getModel("adminService");

    oModel.read("/AvailableManagers", {
      success: function (oData) {
        let list = oData.results || [];

        let match = list.find(m => m.ID === managerGuid);
        if (!match) {
          resolve(null);
          return;
        }

        resolve(match.ID);  // <-- THIS is what you must send
      },
      error: reject
    });
  });
},

    onCancelUser: function () {
      if (this._oUserDialog) {
        this._oUserDialog.close();
      }
    },

    // Project Management Functions
    onAddProject: function () {
      this._loadProjectDialog("create");
    },

    onEditProject: function (oEvent) {
      var oSelectedProject = oEvent.getSource().getBindingContext().getObject();
      this._loadProjectDialog("edit", oSelectedProject);
    },

    onDeleteProject: function (oEvent) {
      var oSelectedProject = oEvent.getSource().getBindingContext().getObject();

      MessageBox.confirm(
        "Are you sure you want to delete project '" + oSelectedProject.name + "'?",
        {
          title: "Delete Project",
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              this._deleteProjectInOData(oSelectedProject);
            }
          }.bind(this)
        }
      );
    },

    // _loadProjectDialog: async function (sMode, oProjectData) {
    //   const managerList = await this._loadAvailableManagers();

    //   var oViewModel = new JSONModel({
    //     mode: sMode,
    //     projectData: oProjectData ? JSON.parse(JSON.stringify(oProjectData)) : {
    //       ID: "",
    //       name: "",
    //       projectID: "",
    //       description: "",
    //       managerId: "",
    //       budget: 0,
    //       allocatedHours: 0,
    //       usedHours: 0,
    //       startDate: new Date().toISOString().split('T')[0],
    //       endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    //       client: "",
    //       status: "Planning"
    //     },
    //     availableManagers: managerList
    //   });
    //   if (!this._oProjectDialog) {
    //     this._oProjectDialog = new Dialog({
    //       title: sMode === "create" ? "Create New Project" : "Edit Project",
    //       contentWidth: "600px",
    //       content: [
    //         new SimpleForm({
    //           layout: "ResponsiveGridLayout",
    //           editable: true,
    //           content: [
    //             new Label({ text: "Project Name" }),
    //             new Input({
    //               value: "{/projectData/name}",
    //               required: true,
    //               valueStateText: "Project Name is required"
    //             }),

    //             // new Label({ text: "Description" }),
    //             // new Input({ value: "{/projectData/description}" }),

    //             new Label({ text: "Project Manager" }),
    //             new Select({
    //               selectedKey: "{/projectData/managerId}",
    //               items: {
    //                 path: "/managers",
    //                 template: new Item({
    //                   key: "{userId}",
    //                   text: "{firstName} {lastName}"
    //                 })
    //               },
    //               required: true
    //             }),

    //             new Label({ text: "Budget ($)" }),
    //             new Input({
    //               value: "{/projectData/budget}",
    //               type: "Number",
    //               valueStateText: "Budget must be a number"
    //             }),

    //             new Label({ text: "Allocated Hours" }),
    //             new Input({
    //               value: "{/projectData/allocatedHours}",
    //               type: "Number",
    //               required: true,
    //               valueStateText: "Allocated Hours is required"
    //             }),

    //             // new Label({ text: "Used Hours" }),
    //             // new Input({
    //             //   value: "{/projectData/usedHours}",
    //             //   type: "Number",
    //             //   valueStateText: "Used Hours must be a number"
    //             // }),

    //             new Label({ text: "Start Date" }),
    //             new DatePicker({
    //               value: "{/projectData/startDate}",
    //               valueFormat: "yyyy-MM-dd",
    //               required: true
    //             }),

    //             new Label({ text: "End Date" }),
    //             new DatePicker({
    //               value: "{/projectData/endDate}",
    //               valueFormat: "yyyy-MM-dd",
    //               required: true
    //             }),

    //             // new Label({ text: "Client" }),
    //             // new Input({ value: "{/projectData/client}" }),

    //             new Label({ text: "Status" }),
    //             new Select({
    //               selectedKey: "{/projectData/status}",
    //               items: [
    //                 new Item({ key: "Planning", text: "Planning" }),
    //                 new Item({ key: "Active", text: "Active" }),
    //                 new Item({ key: "On Hold", text: "On Hold" }),
    //                 new Item({ key: "Completed", text: "Completed" }),
    //                 new Item({ key: "Cancelled", text: "Cancelled" })
    //               ],
    //               required: true
    //             })
    //           ]
    //         })
    //       ],
    //       beginButton: new Button({
    //         text: "Save",
    //         type: "Emphasized",
    //         press: this.onSaveProject.bind(this)
    //       }),
    //       endButton: new Button({
    //         text: "Cancel",
    //         press: this.onCancelProject.bind(this)
    //       })
    //     });

    //     this.getView().addDependent(this._oProjectDialog);
    //   }

    //   // Set up the model for the dialog
      

    //   this._oProjectDialog.setModel(oViewModel);
    //   this._oProjectDialog.open();
    // },
_loadProjectDialog: async function (sMode, oProjectData) {
    const managerList = await this._loadAvailableManagers();

    var oViewModel = new JSONModel({
        mode: sMode,
        projectData: oProjectData ? JSON.parse(JSON.stringify(oProjectData)) : {
            ID: "",
            projectId: "",
            name: "",
            description: "",
            managerId: "",
            managerName: "",
            budget: 0,
            allocatedHours: 0,
            usedHours: 0,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            status: "Planning"
        },
        availableManagers: managerList // <-- RIGHT binding
    });

    if (!this._oProjectDialog) {
        this._oProjectDialog = new Dialog({
            title: sMode === "create" ? "Create Project" : "Edit Project",
            contentWidth: "600px",
            content: [
                new SimpleForm({
                    editable: true,
                    content: [
                        new Label({ text: "Project Name" }),
                        new Input({
                            value: "{/projectData/name}",
                            required: true
                        }),

                        new Label({ text: "Project Manager" }),
                        new Select({
                            selectedKey: "{/projectData/managerId}",
                            items: {
                                path: "/availableManagers",
                                template: new sap.ui.core.Item({
                                    key: "{ID}", // <-- Use Backend CUID
                                    text: "{firstName} {lastName}"
                                })
                            },
                            change: function (oEvent) {
                                const selectedItem = oEvent.getSource().getSelectedItem();
                                const selectedKey = oEvent.getSource().getSelectedKey();
                                const managerName = selectedItem ? selectedItem.getText() : "";

                                let data = oViewModel.getProperty("/projectData");
                                data.managerId = selectedKey;
                                data.managerName = managerName;
                                oViewModel.setProperty("/projectData", data);
                            }
                        }),

                        new Label({ text: "Budget ($)" }),
                        new Input({
                            value: "{/projectData/budget}",
                            type: "Number"
                        }),

                        new Label({ text: "Allocated Hours" }),
                        new Input({
                            value: "{/projectData/allocatedHours}",
                            type: "Number"
                        }),

                        new Label({ text: "Start Date" }),
                        new DatePicker({
                            value: "{/projectData/startDate}",
                            valueFormat: "yyyy-MM-dd"
                        }),

                        new Label({ text: "End Date" }),
                        new DatePicker({
                            value: "{/projectData/endDate}",
                            valueFormat: "yyyy-MM-dd"
                        }),

                        new Label({ text: "Status" }),
                        new Select({
                            selectedKey: "{/projectData/status}",
                            items: [
                                new Item({ key: "Planning", text: "Planning" }),
                                new Item({ key: "Active", text: "Active" }),
                                new Item({ key: "On Hold", text: "On Hold" }),
                                new Item({ key: "Completed", text: "Completed" })
                            ]
                        })
                    ]
                })
            ],
            beginButton: new Button({
                text: "Save",
                type: "Emphasized",
                press: this.onSaveProject.bind(this)
            }),
            endButton: new Button({
                text: "Cancel",
                press: this.onCancelProject.bind(this)
            })
        });

        this.getView().addDependent(this._oProjectDialog);
    }

    this._oProjectDialog.setModel(oViewModel);
    this._oProjectDialog.open();
},

    // Save project with immediate UI update for manager name
    onSaveProject: function () {
      var oDialog = this._oProjectDialog;
      var oViewModel = oDialog.getModel();
      var oProjectData = JSON.parse(JSON.stringify(oViewModel.getProperty("/projectData")));
      var sMode = oViewModel.getProperty("/mode");

      // Validate required fields
      if (!oProjectData.name || !oProjectData.startDate || !oProjectData.endDate || !oProjectData.allocatedHours) {
        MessageToast.show("Please fill in all required fields");
        return;
      }

      // Parse numeric values
      oProjectData.budget = parseFloat(oProjectData.budget) || 0;
      oProjectData.allocatedHours = parseFloat(oProjectData.allocatedHours) || 0;
      oProjectData.usedHours = parseFloat(oProjectData.usedHours) || 0;

      // Validate dates
      var startDate = new Date(oProjectData.startDate);
      var endDate = new Date(oProjectData.endDate);
      if (endDate <= startDate) {
        MessageToast.show("End date must be after start date");
        return;
      }

      // Validate hours
      if (oProjectData.usedHours < 0 || oProjectData.allocatedHours < 0) {
        MessageToast.show("Hours cannot be negative");
        return;
      }

      if (oProjectData.usedHours > oProjectData.allocatedHours) {
        MessageToast.show("Used hours cannot exceed allocated hours");
        return;
      }

      // Update local model immediately with manager name
      if (sMode === "edit") {
    var oModel = this.getView().getModel();
    var aProjects = oModel.getProperty("/projects");
    var iIndex = aProjects.findIndex(project => project.projectId === oProjectData.projectId);

    if (iIndex !== -1) {
        // Get selected manager from dialog model
        let aManagerList = oViewModel.getProperty("/availableManagers");
        let selectedManager = aManagerList.find(m => m.ID === oProjectData.managerId);

        // If manager found: update manager name + backend fields
        let managerName = "Unknown Manager";
        if (selectedManager) {
            managerName = selectedManager.firstName + " " + selectedManager.lastName;
            oProjectData.projectOwnerName = managerName;
            oProjectData.projectOwnerId = selectedManager.ID;  // CUID for backend
        }

        // Update UI model instantly
        aProjects[iIndex] = {
            ...aProjects[iIndex],
            name: oProjectData.name,
            description: oProjectData.description,
            managerId: oProjectData.managerId,
            managerName: managerName,
            budget: oProjectData.budget,
            allocatedHours: oProjectData.allocatedHours,
            usedHours: oProjectData.usedHours,
            startDate: oProjectData.startDate,
            endDate: oProjectData.endDate,
            client: oProjectData.client,
            status: oProjectData.status
        };

        oModel.setProperty("/projects", aProjects);
        oModel.refresh(true);

        MessageToast.show("Project updated successfully in UI");
    }
}
 else if (sMode === "create") {
        // For new projects, add to local model temporarily
        // var oModel = this.getView().getModel();
        // var aProjects = oModel.getProperty("/projects");

        // // Get manager name from managers list
        // var managers = this._getManagersList();
        // var selectedManager = managers.find(manager => manager.userId === oProjectData.managerId);
        // var managerName = selectedManager ? selectedManager.firstName + " " + selectedManager.lastName : "Unknown Manager";

        // var newProjectId = "PRJ" + Math.floor(Math.random() * 100000).toString().padStart(5, "0");
        // var newProject = {
        //   projectId: newProjectId,
        //   name: oProjectData.name,
        //   description: oProjectData.description,
        //   managerId: oProjectData.managerId,
        //   managerName: managerName, // Set the manager name immediately
        //   budget: oProjectData.budget,
        //   allocatedHours: oProjectData.allocatedHours,
        //   usedHours: oProjectData.usedHours,
        //   startDate: oProjectData.startDate,
        //   endDate: oProjectData.endDate,
        //   client: oProjectData.client,
        //   status: oProjectData.status,
        //   isBillable: true,
        //   teamMembers: []
        // };

        // aProjects.push(newProject);
        // oModel.setProperty("/projects", aProjects);
        // oModel.refresh(true);
        MessageToast.show("Project added successfully in UI");
      }

      // Then update in OData service WITHOUT automatic refresh
      if (sMode === "create") {
        this._createProjectInOData(oProjectData, false); // Don't refresh after create
      } else {
        this._updateProjectInOData(oProjectData, false); // Don't refresh after update
      }

      oDialog.close();
    },

    // Create project in OData service
    _createProjectInOData: function (oProjectData, bRefresh = true) {
    var oModel = this.getOwnerComponent().getModel("adminService");
    var that = this;

    var oProjectPayload = {
        projectName: oProjectData.name,
        description: oProjectData.description || "",
        projectOwner_ID: oProjectData.managerId, // ✅ Backend CUID
        budget: Number(oProjectData.budget) || 0,
        allocatedHours: Number(oProjectData.allocatedHours) || 0,
        startDate: oProjectData.startDate,
        endDate: oProjectData.endDate,
        status: oProjectData.status,
        isBillable: true
    };

    console.log("Creating project with payload:", oProjectPayload);

    oModel.create("/Projects", oProjectPayload, {
        success: function (oData) {
            MessageToast.show("Project created successfully");

            // Update UI with backend ID + proper manager name
            var managers = that._getManagersList();
            var selected = managers.find(m => m.userId === oProjectData.managerId);
            var managerName = selected
                ? (selected.firstName + " " + selected.lastName).trim()
                : "Unknown Manager";

            var oViewModel = that.getView().getModel();
            var aProjects = oViewModel.getProperty("/projects") || [];

            aProjects.push({
                projectId: oData.projectID,  // ✔ Backend returned display ID
                name: oProjectData.name,
                description: oProjectData.description,
                managerId: oProjectData.managerId, // CUID
                managerName: managerName, // ✔ Always correct
                budget: oProjectData.budget,
                allocatedHours: oProjectData.allocatedHours,
                usedHours: oProjectData.usedHours || 0,
                startDate: oProjectData.startDate,
                endDate: oProjectData.endDate,
                client: oProjectData.client,
                status: oProjectData.status,
                isBillable: true,
                teamMembers: []
            });

            oViewModel.setProperty("/projects", aProjects);
            oViewModel.refresh(true);

            if (bRefresh) {
                that._loadProjects();
            }
        },

        error: function (oError) {
            console.error("Error creating project:", oError);
            MessageToast.show("Error creating project");

            if (bRefresh) {
                that._loadProjects();
            }
        }
    });
},

    // Update project in OData service
    _updateProjectInOData: function (oProjectData, bRefresh = true) {
      var oModel = this.getOwnerComponent().getModel("adminService");
      var that = this;

      if (!oProjectData.projectId) {
        MessageToast.show("Missing projectId. Cannot update.");
        console.warn("No projectId found in projectData:", oProjectData);
        return;
      }

      // 1️⃣ Read all projects and find backend CUID
      oModel.read("/Projects", {
        success: function (oData) {
          if (!oData.results || !oData.results.length) {
            MessageToast.show("No projects found in backend.");
            return;
          }

          // 2️⃣ Find backend entry by projectId (display value)
          var backendItem = oData.results.find(p => p.projectID === oProjectData.projectId);

          if (!backendItem) {
            MessageToast.show("Project not found in backend. Cannot update.");
            console.warn("No backend match for projectId:", oProjectData.projectId);
            return;
          }

          // 3️⃣ Use backend CUID
          var backendId = backendItem.ID;

          if (!backendId) {
            MessageToast.show("Backend Project ID missing. Cannot update.");
            console.error("Backend item has no ID field:", backendItem);
            return;
          }

          // 4️⃣ Create Update Payload
          var oProjectPayload = {
            projectName: oProjectData.name,
            description: oProjectData.description || "",
            projectOwner_ID: oProjectData.managerId,
            projectOwnerName: oProjectData.managerName,
            budget: parseFloat(oProjectData.budget) || 0,
            allocatedHours: parseFloat(oProjectData.allocatedHours) || 0,
            startDate: oProjectData.startDate,
            endDate: oProjectData.endDate,
            status: oProjectData.status
          };

          var sPath = "/Projects('" + backendId + "')";

          console.log("Updating project:", backendId, oProjectPayload);

          // 5️⃣ Perform Update
          oModel.update(sPath, oProjectPayload, {
            success: function () {
              MessageToast.show("Project updated successfully");
              // Only refresh if explicitly requested
              if (bRefresh) {
                that._loadProjects();
              }
            },
            error: function (oError) {
              console.error("Error updating project:", oError);
              MessageToast.show("Error updating project");
              // Only refresh if explicitly requested
              if (bRefresh) {
                that._loadProjects();
              }
            }
          });
        },

        error: function (err) {
          console.error("Error reading Projects:", err);
          MessageToast.show("Failed to fetch backend projects.");
        }
      });
    },

    // Delete project in OData service
    // Update the _deleteProjectInOData function in Admin.controller.js:

    _deleteProjectInOData: function (oProjectData) {
      var oModel = this.getOwnerComponent().getModel("adminService");
      var that = this;

      // Step 1: Read all Projects to find the correct backend ID
      oModel.read("/Projects", {
        success: function (oData) {
          if (!oData.results || oData.results.length === 0) {
            MessageToast.show("No projects found. Cannot delete.");
            return;
          }

          // Step 2: Find the matching project by projectId (display ID)
          var oMatch = oData.results.find(function (proj) {
            return proj.projectID === oProjectData.projectId;
          });

          if (!oMatch) {
            MessageToast.show("Project not found. Cannot delete.");
            console.warn("No backend match for projectId:", oProjectData.projectId);
            return;
          }

          var backendId = oMatch.ID;
          var sPath = "/Projects('" + backendId + "')";

          console.log("Deleting project with backend ID:", backendId);

          // Step 3: Delete with valid backend CUID
          oModel.remove(sPath, {
            success: function () {
              MessageToast.show("Project deleted successfully");
              that._loadProjects();
            },
            error: function (oError) {
              console.error("Error deleting project:", oError);
              MessageToast.show("Error deleting project");
            }
          });
        },
        error: function (oError) {
          console.error("Error loading projects:", oError);
          MessageToast.show("Error fetching project list");
        }
      });
    },

    onCancelProject: function () {
      if (this._oProjectDialog) {
        this._oProjectDialog.close();
      }
    },

    // Analytics Functions
    onRefreshAnalytics: function () {
      this._refreshAnalyticsData();
      MessageToast.show("Analytics data refreshed");
    },

    // In your Admin.controller.js, update the _refreshAnalyticsData function:
    // In your Admin.controller.js, update the _refreshAnalyticsData function:

    _refreshAnalyticsData: function () {
      var oModel = this.getView().getModel();
      var aProjects = oModel.getProperty("/projects") || [];
      var aUsers = oModel.getProperty("/users") || [];

      // Update project hours data
      var aProjectHours = aProjects.map(function (project) {
        var bookedHours = project.usedHours || 0;
        var allocatedHours = project.allocatedHours || 0;
        var remainingHours = allocatedHours - bookedHours;
        var utilization = allocatedHours > 0 ? Math.round((bookedHours / allocatedHours) * 100) : 0;

        return {
          projectId: project.projectId,
          projectName: project.name,
          allocatedHours: allocatedHours,
          bookedHours: bookedHours,
          remainingHours: remainingHours,
          utilization: utilization
        };
      });

      // Update manager teams data
      var aManagerTeams = this._getManagersList().map(function (manager) {
        var aTeamMembers = aUsers.filter(user =>
          user.managerId === manager.userId && user.status === "Active"
        );
        var aManagerProjects = aProjects.filter(project =>
          project.managerId === manager.userId
        );

        var totalBookedHours = aManagerProjects.reduce(function (sum, project) {
          return sum + (project.usedHours || 0);
        }, 0);

        var totalAllocatedHours = aManagerProjects.reduce(function (sum, project) {
          return sum + (project.allocatedHours || 0);
        }, 0);

        var avgUtilization = totalAllocatedHours > 0 ?
          Math.round((totalBookedHours / totalAllocatedHours) * 100) : 0;

        return {
          managerId: manager.userId,
          managerName: manager.firstName + " " + manager.lastName,
          teamSize: aTeamMembers.length,
          totalProjects: aManagerProjects.length,
          totalBookedHours: totalBookedHours,
          avgUtilization: avgUtilization
        };
      });

      // Update project durations data with proper date handling
      var aProjectDurations = aProjects.map(function (project) {
        // Ensure dates are properly handled - keep as Date objects
        var startDate = project.startDate ? new Date(project.startDate) : null;
        var endDate = project.endDate ? new Date(project.endDate) : null;
        var today = new Date();

        // Calculate duration in days
        var durationDays = 0;
        if (startDate && endDate) {
          durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        }

        // Calculate days remaining
        var daysRemaining = 0;
        if (endDate) {
          daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        }

        // Determine timeline status
        var timelineStatus = "On Track";
        if (project.status === "Completed") {
          timelineStatus = "Completed";
        } else if (daysRemaining < 0) {
          timelineStatus = "Delayed";
        } else if (daysRemaining < 14) {
          timelineStatus = "At Risk";
        }

        return {
          projectId: project.projectId,
          projectName: project.name,
          // Keep dates as Date objects for proper formatting in the view
          startDate: startDate,
          endDate: endDate,
          durationDays: durationDays,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          timelineStatus: timelineStatus
        };
      });

      // Calculate overall progress from project data
      var totalBookedHours = aProjects.reduce(function (sum, project) {
        return sum + (project.usedHours || 0);
      }, 0);

      var totalAllocatedHours = aProjects.reduce(function (sum, project) {
        return sum + (project.allocatedHours || 0);
      }, 0);

      var totalRemainingHours = totalAllocatedHours - totalBookedHours;
      var averageUtilization = totalAllocatedHours > 0 ? Math.round((totalBookedHours / totalAllocatedHours) * 100) : 0;

      // Update the overall progress data
      oModel.setProperty("/overallProgress", {
        totalBookedHours: totalBookedHours,
        totalAllocatedHours: totalAllocatedHours,
        totalRemainingHours: totalRemainingHours,
        averageUtilization: averageUtilization
      });

      oModel.setProperty("/projectHours", aProjectHours);
      oModel.setProperty("/managerTeams", aManagerTeams);
      oModel.setProperty("/projectDurations", aProjectDurations);
      oModel.refresh(true);

      // Also refresh the overall progress data from the backend
      this._loadOverallProgress();
    },

    // Utility Functions
    formatCurrency: function (fValue) {
      if (fValue === null || fValue === undefined || isNaN(fValue)) {
        return "$0.00";
      }
      var value = parseFloat(fValue);
      return "$" + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    },

    // Refresh functions to reload the entire page
    onRefreshUsers: function () {
      this._loadEmployees();
      MessageToast.show("Users data refreshed");
    },

    onRefreshProjects: function () {
      this._loadProjects();
      MessageToast.show("Projects data refreshed");
    },

    // Function to refresh the entire page
    onRefreshPage: function () {
      window.location.reload();
    }
  });
});


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
