UPDATED CODE 3

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/TextArea",
    "sap/m/DatePicker",
    "sap/m/TimePicker",
    "sap/ui/core/Item",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/date/UI5Date",
    "sap/ui/core/Fragment",
    "sap/m/Token",
    "sap/m/SuggestionItem",
    "sap/m/MultiInput",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/Label",
    "sap/ui/unified/CalendarAppointment"
], function(Controller, JSONModel, MessageToast, Dialog, Button, Input, TextArea, DatePicker, TimePicker, Item, DateFormat, Filter, FilterOperator, UI5Date, Fragment, Token, SuggestionItem, MultiInput, VBox, HBox, Text, Label, CalendarAppointment) {
    "use strict";

    return Controller.extend("com.view1.project1.controller.View1", {
        roles: {
            manager: "manager",
            employee: "employee"
        },
        
        onInit: function() {
            var oData = this._generateSampleData();
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
            
            this._oOriginalPeople = JSON.parse(JSON.stringify(oData.people));
            
            this._updateCurrentIntervalText();
            this._populatePersonSelect();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            
            var today = new Date();
            today.setDate(1); // Start from first day of month for month view
            this.byId("planningCalendar").setStartDate(today);
            
            this._applyTeamsMonthViewStyling();
        },
        
        onAfterRendering: function() {
            this._applyTeamsMonthViewStyling();
            var oPlanningCalendar = this.byId("planningCalendar");
            if (oPlanningCalendar) {
                setTimeout(function() {
                    oPlanningCalendar.rerender();
                }, 100);
            }
        },
        
        _generateSampleData: function() {
            var today = new Date();
            var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            
            return {
                startDate: startOfMonth,
                calendars: [
                    { name: "My Calendar", selected: true },
                    { name: "Team Schedule", selected: true },
                    { name: "Holidays", selected: false },
                    { name: "Personal", selected: true }
                ],
                people: [
                    { name: "Abhishek Jha", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Abhishek Jha", "Design Project", startOfMonth) },
                    { name: "Aman Anand", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Aman Anand", "Development", startOfMonth) },
                    { name: "Ayushi Khanokar", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Ayushi Khanokar", "Testing", startOfMonth) },
                    { name: "Jayant Kumar", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Jayant Kumar", "Development", startOfMonth) },
                    { name: "Mohd Aakib", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Mohd Aakib", "Design", startOfMonth) },
                    { name: "Mohammed Nadeem Abbas", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Mohammed Nadeem Abbas", "Development", startOfMonth) },
                    { name: "Pushkar Kumar Jha", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Pushkar Kumar Jha", "Testing", startOfMonth) },
                    { name: "Pushpak Jha", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Pushpak Jha", "Design", startOfMonth) },
                    { name: "Shivam Shrivastav", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Shivam Shrivastav", "Development", startOfMonth) },
                    { name: "Suraj Mishra", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Suraj Mishra", "Project Management", startOfMonth) },
                    { name: "Swarupa Patil", role: "Project tester", appointments: this._generateMonthAppointmentsForPerson("Swarupa Patil", "Design", startOfMonth) },
                    { name: "Tanu Singh", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Tanu Singh", "Testing", startOfMonth) },
                    { name: "Vikash Ojha", role: "Team Member", appointments: this._generateMonthAppointmentsForPerson("Vikash Ojha", "Development", startOfMonth) },
                    { name: "Vikrant Raj", role: "Project Manager", appointments: this._generateMonthAppointmentsForPerson("Vikrant Raj", "Design", startOfMonth) },
                    { name: "YK Yugal Kishore", role: "Team Lead", appointments: this._generateMonthAppointmentsForPerson("YK Yugal Kishore", "Management", startOfMonth) }
                ]
            };
        },
        
        _generateMonthAppointmentsForPerson: function(personName, project, startOfMonth) {
            var appointments = [];
            var daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
            
            // Generate appointments for each day in the month
            for (var day = 1; day <= daysInMonth; day++) {
                var currentDate = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day);
                var dayOfWeek = currentDate.getDay();
                
                // Skip weekends (Saturday = 6, Sunday = 0)
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    var startHour = 9;
                    var hoursPerDay = this._getRandomHours(6, 9);
                    var endHour = startHour + hoursPerDay;
                    
                    // Main work appointment
                    appointments.push({
                        id: this._generateAppointmentId(),
                        start: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day, startHour, 0),
                        end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day, endHour, 0),
                        title: project + " - " + this._getTaskForDay(day),
                        info: personName + " - " + hoursPerDay + "h work",
                        type: "Type0" + (day % 5 + 1),
                        tentative: false,
                        color: this._getColorForHours(hoursPerDay),
                        icon: "sap-icon://workflow-tasks"
                    });
                    
                    // Project management task (shorter appointment)
                    appointments.push({
                        id: this._generateAppointmentId(),
                        start: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day, 10, 0),
                        end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day, 11, 0),
                        title: "Project Management",
                        info: personName + " - Daily tasks",
                        type: "Type07",
                        tentative: false,
                        color: "#6A6A6A",
                        icon: "sap-icon://project-definition"
                    });
                    
                    // Client meeting on specific days (like in your image)
                    if (day % 7 === 2) { // Every Tuesday
                        appointments.push({
                            id: this._generateAppointmentId(),
                            start: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day, 14, 0),
                            end: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), day, 15, 0),
                            title: "Client Meeting",
                            info: personName + " - Weekly sync",
                            type: "Type09",
                            tentative: false,
                            color: "#2B7D2B",
                            icon: "sap-icon://meeting-room"
                        });
                    }
                }
            }
            
            return appointments;
        },
        
        _generateAppointmentId: function() {
            return 'appt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        _getRandomHours: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        
        _formatTime: function(oDate) {
            return DateFormat.getTimeInstance({pattern: "h a"}).format(oDate);
        },
        
        _getTaskForDay: function(dayIndex) {
            var tasks = ["Design system", "Mockup designs", "User testing", "Documentation", "Client meeting", "Code review", "Planning", "Development", "Testing", "Deployment"];
            return tasks[dayIndex % tasks.length];
        },
        
        _addDays: function(date, days, hours, minutes) {
            var newDate = new Date(date);
            newDate.setDate(newDate.getDate() + days);
            newDate.setHours(hours, minutes, 0, 0);
            return newDate;
        },
        
        _getColorForHours: function(hours) {
            if (hours >= 8) return "#2B7D2B"; // Green for 8+ hours
            else if (hours >= 7) return "#FFD700"; // Yellow for 7+ hours
            else return "#6A6A6A"; // Grey for less than 7 hours
        },
        
        _populatePersonSelect: function() {
            var oPersonSelect = this.byId("personSelect");
            oPersonSelect.removeAllItems();
            oPersonSelect.addItem(new Item({ key: "all", text: "All Members" }));
            
            this._oOriginalPeople.forEach(function(oPerson) {
                oPersonSelect.addItem(new Item({ key: oPerson.name, text: oPerson.name }));
            });
        },
        
        _updateCurrentIntervalText: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            var sViewKey = oPlanningCalendar.getViewKey();
            var oCurrentIntervalMain = this.byId("currentIntervalMain");
            
            if (!oCurrentIntervalMain) return;
            
            if (sViewKey === "Day") {
                oCurrentIntervalMain.setText(DateFormat.getDateInstance({pattern: "EEEE, MMMM d, yyyy"}).format(oStartDate));
            } else if (sViewKey === "Week") {
                var oEndDate = new Date(oStartDate);
                oEndDate.setDate(oStartDate.getDate() + 6);
                oCurrentIntervalMain.setText(DateFormat.getDateInstance({pattern: "MMM d"}).format(oStartDate) + " - " + DateFormat.getDateInstance({pattern: "MMM d, yyyy"}).format(oEndDate));
            } else if (sViewKey === "Month") {
                oCurrentIntervalMain.setText(DateFormat.getDateInstance({pattern: "MMMM yyyy"}).format(oStartDate));
            }
        },
        
        _updateMiniCalendar: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            var oMiniCalendar = this.byId("miniCalendar");
            // if (oMiniCalendar) {
            //     oMiniCalendar.setSelectedDate(oStartDate);
            // }
        },
        
        _updateTimesheetSummary: function() {
            var oModel = this.getView().getModel();
            var aPeople = oModel.getProperty("/people");
            var iBillableHours = 0, iNonBillableHours = 0;
            
            aPeople.forEach(function(oPerson) {
                oPerson.appointments.forEach(function(oAppointment) {
                    var hours = (new Date(oAppointment.end) - new Date(oAppointment.start)) / (1000 * 60 * 60);
                    if (oAppointment.title.includes("Project Management") || oAppointment.title.includes("Client Meeting")) {
                        iNonBillableHours += hours;
                    } else {
                        iBillableHours += hours;
                    }
                });
            });
            
            var billableHours = Math.floor(iBillableHours);
            var billableMinutes = Math.round((iBillableHours - billableHours) * 60);
            var nonBillableHours = Math.floor(iNonBillableHours);
            var nonBillableMinutes = Math.round((iNonBillableHours - nonBillableHours) * 60);
            
            this.byId("billableText").setText("Billable time: " + billableHours + "h " + billableMinutes + "m");
            this.byId("nonBillableText").setText("Non-billable: " + nonBillableHours + "h " + nonBillableMinutes + "m");
        },
        
        _applyTeamsMonthViewStyling: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            // Remove all styling classes first
            oPlanningCalendar.removeStyleClass("teams-month-view");
            oPlanningCalendar.removeStyleClass("teams-week-view");
            oPlanningCalendar.removeStyleClass("teams-day-view");
            
            // Add appropriate styling based on current view
            if (oPlanningCalendar.getViewKey() === "Month") {
                oPlanningCalendar.addStyleClass("teams-month-view");
            } else if (oPlanningCalendar.getViewKey() === "Week") {
                oPlanningCalendar.addStyleClass("teams-week-view");
            } else {
                oPlanningCalendar.addStyleClass("teams-day-view");
            }
        },
        
        getUserRole: function() {
            return this.roles.manager;
        },
        
        onTodayPress: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var today = new Date();
            
            if (oPlanningCalendar.getViewKey() === "Month") {
                today.setDate(1); // Start from first day of month
            }
            
            oPlanningCalendar.setStartDate(today);
            this.getView().getModel().setProperty("/startDate", today);
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            MessageToast.show("Navigated to today");
        },
        
        onPrevPress: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            var sViewKey = oPlanningCalendar.getViewKey();
            
            var oNewStartDate = new Date(oStartDate);
            if (sViewKey === "Day") {
                oNewStartDate.setDate(oStartDate.getDate() - 1);
            } else if (sViewKey === "Week") {
                oNewStartDate.setDate(oStartDate.getDate() - 7);
            } else if (sViewKey === "Month") {
                oNewStartDate.setMonth(oStartDate.getMonth() - 1);
            }
            
            oPlanningCalendar.setStartDate(oNewStartDate);
            this.getView().getModel().setProperty("/startDate", oNewStartDate);
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
        },
        
        onNextPress: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            var sViewKey = oPlanningCalendar.getViewKey();
            
            var oNewStartDate = new Date(oStartDate);
            if (sViewKey === "Day") {
                oNewStartDate.setDate(oStartDate.getDate() + 1);
            } else if (sViewKey === "Week") {
                oNewStartDate.setDate(oStartDate.getDate() + 7);
            } else if (sViewKey === "Month") {
                oNewStartDate.setMonth(oStartDate.getMonth() + 1);
            }
            
            oPlanningCalendar.setStartDate(oNewStartDate);
            this.getView().getModel().setProperty("/startDate", oNewStartDate);
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
        },
        
        onDateSelect: function(oEvent) {
            var oSelectedDate = oEvent.getParameter("date");
            var oPlanningCalendar = this.byId("planningCalendar");
            
            if (oPlanningCalendar.getViewKey() === "Month") {
                // In month view, just update the start date to maintain month view
                var firstDayOfMonth = new Date(oSelectedDate.getFullYear(), oSelectedDate.getMonth(), 1);
                oPlanningCalendar.setStartDate(firstDayOfMonth);
                this.getView().getModel().setProperty("/startDate", firstDayOfMonth);
            } else {
                oPlanningCalendar.setStartDate(oSelectedDate);
                this.getView().getModel().setProperty("/startDate", oSelectedDate);
            }
            
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            
            var sFormattedDate = DateFormat.getDateInstance({pattern: "EEEE, MMMM d, yyyy"}).format(oSelectedDate);
            MessageToast.show("Selected date: " + sFormattedDate);
        },
        
        onViewChange: function(oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oPlanningCalendar = this.byId("planningCalendar");
            oPlanningCalendar.setViewKey(sSelectedKey);
            
            var oStartDate = new Date();
            
            if (sSelectedKey === "Day") {
                // Keep current day
            } else if (sSelectedKey === "Week") {
                // Start from Monday of current week
                var dayOfWeek = oStartDate.getDay();
                var diff = oStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                oStartDate.setDate(diff);
            } else if (sSelectedKey === "Month") {
                // Start from first day of month
                oStartDate.setDate(1);
            }
            
            oPlanningCalendar.setStartDate(oStartDate);
            this.getView().getModel().setProperty("/startDate", oStartDate);
            
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            this._applyTeamsMonthViewStyling();
            
            MessageToast.show("View changed to: " + sSelectedKey);
        },
        
        onPersonChange: function(oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel();
            
            if (sSelectedKey === "all") {
                oModel.setProperty("/people", JSON.parse(JSON.stringify(this._oOriginalPeople)));
            } else {
                var oSelectedPerson = this._oOriginalPeople.find(function(oPerson) {
                    return oPerson.name === sSelectedKey;
                });
                oModel.setProperty("/people", oSelectedPerson ? [JSON.parse(JSON.stringify(oSelectedPerson))] : []);
            }
            
            this._updateTimesheetSummary();
            MessageToast.show("Showing schedule for: " + (sSelectedKey === "all" ? "All Members" : sSelectedKey));
        },
        
        onAppointmentSelect: function(oEvent) {
            var oAppointment = oEvent.getParameter("appointment");
            if (oAppointment) {
                var hours = (oAppointment.getEndDate() - oAppointment.getStartDate()) / (1000 * 60 * 60);
                var colorInfo = oAppointment.getColor() === "#2B7D2B" ? " (Green - 8+ hours)" : 
                              oAppointment.getColor() === "#FFD700" ? " (Yellow - 7+ hours)" : 
                              " (Grey - less than 7 hours)";
                MessageToast.show("Selected: " + oAppointment.getTitle() + "\n" + hours.toFixed(1) + " hours" + colorInfo);
            }
        },
        
        onAppointmentDrop: function(oEvent) {
            var oDroppedAppointment = oEvent.getParameter("appointment");
            var oNewStartDate = oEvent.getParameter("startDate");
            var oNewEndDate = oEvent.getParameter("endDate");
            var oRow = oEvent.getParameter("row");
            
            // Find and update the appointment in the model
            var oModel = this.getView().getModel();
            var aPeople = oModel.getProperty("/people");
            
            for (var i = 0; i < aPeople.length; i++) {
                var oPerson = aPeople[i];
                var aAppointments = oPerson.appointments;
                
                for (var j = 0; j < aAppointments.length; j++) {
                    var oAppointment = aAppointments[j];
                    
                    // Compare appointment data to find the dropped one
                    if (this._areAppointmentsEqual(oAppointment, oDroppedAppointment)) {
                        // Update the appointment dates
                        oAppointment.start = new Date(oNewStartDate);
                        oAppointment.end = new Date(oNewEndDate);
                        
                        // Update hours info
                        var hours = (oNewEndDate - oNewStartDate) / (1000 * 60 * 60);
                        oAppointment.info = oPerson.name + " - " + hours.toFixed(1) + "h work";
                        
                        // Update color based on new hours
                        oAppointment.color = this._getColorForHours(hours);
                        
                        break;
                    }
                }
            }
            
            // Refresh the model
            oModel.refresh(true);
            this._updateTimesheetSummary();
            
            MessageToast.show("Appointment moved to: " + 
                DateFormat.getDateTimeInstance({pattern: "MMM d, h:mm a"}).format(oNewStartDate));
        },
        
        onAppointmentResize: function(oEvent) {
            var oResizedAppointment = oEvent.getParameter("appointment");
            var oNewStartDate = oEvent.getParameter("startDate");
            var oNewEndDate = oEvent.getParameter("endDate");
            
            // Find and update the appointment in the model
            var oModel = this.getView().getModel();
            var aPeople = oModel.getProperty("/people");
            
            for (var i = 0; i < aPeople.length; i++) {
                var oPerson = aPeople[i];
                var aAppointments = oPerson.appointments;
                
                for (var j = 0; j < aAppointments.length; j++) {
                    var oAppointment = aAppointments[j];
                    
                    // Compare appointment data to find the resized one
                    if (this._areAppointmentsEqual(oAppointment, oResizedAppointment)) {
                        // Update the appointment dates
                        oAppointment.start = new Date(oNewStartDate);
                        oAppointment.end = new Date(oNewEndDate);
                        
                        // Update hours info
                        var hours = (oNewEndDate - oNewStartDate) / (1000 * 60 * 60);
                        oAppointment.info = oPerson.name + " - " + hours.toFixed(1) + "h work";
                        
                        // Update color based on new hours
                        oAppointment.color = this._getColorForHours(hours);
                        
                        break;
                    }
                }
            }
            
            // Refresh the model
            oModel.refresh(true);
            this._updateTimesheetSummary();
            
            MessageToast.show("Appointment resized: " + hours.toFixed(1) + " hours");
        },
        
        _areAppointmentsEqual: function(oModelAppointment, oUIAppointment) {
            // Compare key properties to identify the same appointment
            return oModelAppointment.title === oUIAppointment.getTitle() &&
                   new Date(oModelAppointment.start).getTime() === oUIAppointment.getStartDate().getTime() &&
                   new Date(oModelAppointment.end).getTime() === oUIAppointment.getEndDate().getTime();
        },
        
        onNewRequestPress: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = new Date(oPlanningCalendar.getStartDate());
            var oModel = this.getView().getModel();
            var aPeople = oModel.getProperty("/people");
            
            if (aPeople.length === 0) return;
            
            var oPerson = aPeople[0];
            var newAppointment = {
                id: this._generateAppointmentId(),
                start: new Date(oStartDate.setHours(9, 0, 0, 0)),
                end: new Date(oStartDate.setHours(10, 0, 0, 0)),
                title: "New Request",
                info: oPerson.name + " - New request created",
                type: "Type06",
                tentative: false,
                color: "#6A6A6A",
                icon: "sap-icon://create"
            };
            
            oPerson.appointments.unshift(newAppointment);
            oModel.refresh(true);
            this._updateTimesheetSummary();
            MessageToast.show("New Request created for " + oPerson.name);
        }
    });
});

UPDATED CODE 2

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/TextArea",
    "sap/m/DatePicker",
    "sap/m/TimePicker",
    "sap/ui/core/Item",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/date/UI5Date",
    "sap/ui/core/Fragment",
    "sap/m/Token",
    "sap/m/SuggestionItem",
    "sap/m/MultiInput",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/Label",
    "sap/ui/unified/CalendarAppointment"
], function(Controller, JSONModel, MessageToast, Dialog, Button, Input, TextArea, DatePicker, TimePicker, Item, DateFormat, Filter, FilterOperator, UI5Date, Fragment, Token, SuggestionItem, MultiInput, VBox, HBox, Text, Label, CalendarAppointment) {
    "use strict";

    return Controller.extend("com.view1.project1.controller.View1", {
        roles: {
            manager: "manager",
            employee: "employee"
        },
        
        onInit: function() {
            var oData = this._generateSampleData();
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
            
            this._oOriginalPeople = JSON.parse(JSON.stringify(oData.people));
            
            this._updateCurrentIntervalText();
            this._populatePersonSelect();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            
            var oAttendeesModel = new JSONModel({
                value: [
                    { name: "Portal Admin", email: "donotreply@risedx.com", status: "Free" },
                    { name: "Pushpak Jha", email: "pushpak.jha@risedx.com", status: "Busy" }
                ]
            });
            this.getView().setModel(oAttendeesModel, "attendees");
            
            var today = new Date();
            this.byId("planningCalendar").setStartDate(today);
            
            this._applyTeamsMonthViewStyling();
            this._enableDragAndDrop();
        },
        
        onAfterRendering: function() {
            this._applyTeamsMonthViewStyling();
            var oPlanningCalendar = this.byId("planningCalendar");
            if (oPlanningCalendar) {
                oPlanningCalendar.setRowHeaderWidth("250px"); // Increased width to ensure names and roles are fully visible
                setTimeout(function() {
                    oPlanningCalendar.rerender(); // Force refresh for proper rendering
                }, 100);
            }
        },
        
        _generateSampleData: function() {
            var today = new Date();
            var startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1);
            
            return {
                startDate: new Date(),
                calendars: [
                    { name: "My Calendar", selected: true },
                    { name: "Team Schedule", selected: true },
                    { name: "Holidays", selected: false },
                    { name: "Personal", selected: true }
                ],
                people: [
                    { name: "Abhishek Jha", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Abhishek Jha", "Design Project", startOfWeek) },
                    { name: "Aman Anand", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Aman Anand", "Development", startOfWeek) },
                    { name: "Ayushi Khanokar", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Ayushi Khanokar", "Testing", startOfWeek) },
                    { name: "Jayant Kumar", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Jayant Kumar", "Development", startOfWeek) },
                    { name: "Mohd Aakib", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Mohd Aakib", "Design", startOfWeek) },
                    { name: "Mohammed Nadeem Abbas", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Mohammed Nadeem Abbas", "Development", startOfWeek) },
                    { name: "Pushkar Kumar Jha", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Pushkar Kumar Jha", "Testing", startOfWeek) },
                    { name: "Pushpak Jha", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Pushpak Jha", "Design", startOfWeek) },
                    { name: "Shivam Shrivastav", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Shivam Shrivastav", "Development", startOfWeek) },
                    { name: "Suraj Mishra", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Suraj Mishra", "Project Management", startOfWeek) },
                    { name: "Swarupa Patil", role: "Project Tester", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Swarupa Patil", "Design", startOfWeek) },
                    { name: "Tanu Singh", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Tanu Singh", "Testing", startOfWeek) },
                    { name: "Vikash Ojha", role: "Team Member", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Vikash Ojha", "Development", startOfWeek) },
                    { name: "Vikrant Raj", role: "Project Manager", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("Vikrant Raj", "Design", startOfWeek) },
                    { name: "YK Yugal Kishore", role: "Team Lead", pic: "sap-icon://employee", appointments: this._generateAppointmentsForPerson("YK Yugal Kishore", "Management", startOfWeek) }
                ]
            };
        },
        
        _generateAppointmentsForPerson: function(personName, project, startOfWeek) {
            var appointments = [];
            var hoursPerDay = [8, 6, 7, 8, 5, 9, 4];
            
            for (var i = 0; i < 7; i++) {
                var startHour = 9;
                var endHour = startHour + hoursPerDay[i];
                
                appointments.push({
                    start: this._addDays(new Date(startOfWeek), i, 10, 0),
                    end: this._addDays(new Date(startOfWeek), i, 11, 0),
                    title: this._formatTime(this._addDays(new Date(startOfWeek), i, 10, 0)) + " Project Management",
                    info: personName + " - Daily project management tasks",
                    type: "Type07",
                    tentative: false,
                    color: this._getColorForHours(1),
                    icon: "sap-icon://project-definition"
                });
                
                appointments.push({
                    start: this._addDays(new Date(startOfWeek), i, startHour, 0),
                    end: this._addDays(new Date(startOfWeek), i, endHour, 0),
                    title: this._formatTime(this._addDays(new Date(startOfWeek), i, startHour, 0)) + " " + project + " - " + this._getTaskForDay(i),
                    info: personName + " - " + this._getTaskDescription(i) + " (" + hoursPerDay[i] + " hours)",
                    type: "Type0" + (i % 5 + 1),
                    tentative: false,
                    color: this._getColorForHours(hoursPerDay[i]),
                    icon: "sap-icon://workflow-tasks"
                });
            }
            
            return appointments;
        },
        
        _formatTime: function(oDate) {
            return DateFormat.getTimeInstance({pattern: "h a"}).format(oDate);
        },
        
        _getTaskForDay: function(dayIndex) {
            var tasks = ["Design system prep", "Mockup filter designs", "User testing", "Documentation", "Client meeting", "Code review", "Planning"];
            return tasks[dayIndex % tasks.length];
        },
        
        _getTaskDescription: function(dayIndex) {
            var descriptions = [
                "Preparing design system components",
                "Creating mockups for filter designs",
                "Conducting user testing sessions",
                "Writing technical documentation",
                "Weekly client sync meeting",
                "Code review and quality assurance",
                "Sprint planning and task allocation"
            ];
            return descriptions[dayIndex % descriptions.length];
        },
        
        _addDays: function(date, days, hours, minutes) {
            var newDate = new Date(date);
            newDate.setDate(newDate.getDate() + days);
            newDate.setHours(hours, minutes, 0, 0);
            return newDate;
        },
        
        _getColorForHours: function(hours) {
            if (hours >= 8) return "#2B7D2B"; // Green for 8+ hours
            else if (hours >= 7) return "#FFD700"; // Yellow for 7+ hours
            else return "#6A6A6A"; // Grey for less than 7 hours
        },
        
        _populatePersonSelect: function() {
            var oPersonSelect = this.byId("personSelect");
            oPersonSelect.removeAllItems();
            oPersonSelect.addItem(new Item({ key: "all", text: "All Members" }));
            
            this._oOriginalPeople.forEach(function(oPerson) {
                oPersonSelect.addItem(new Item({ key: oPerson.name, text: oPerson.name + " (" + oPerson.role + ")" }));
            });
        },
        
        _updateCurrentIntervalText: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            var sViewKey = oPlanningCalendar.getViewKey();
            
            if (sViewKey === "Day") {
                this.byId("currentInterval").setText(DateFormat.getDateInstance({pattern: "EEEE, MMMM d, yyyy"}).format(oStartDate));
            } else if (sViewKey === "WorkWeek") {
                var oEndDate = new Date(oStartDate);
                oEndDate.setDate(oStartDate.getDate() + 4);
                this.byId("currentInterval").setText(DateFormat.getDateInstance({pattern: "MMM d"}).format(oStartDate) + " - " + DateFormat.getDateInstance({pattern: "MMM d, yyyy"}).format(oEndDate));
            } else if (sViewKey === "Week") {
                var oEndDate = new Date(oStartDate);
                oEndDate.setDate(oStartDate.getDate() + 6);
            } else if (sViewKey === "Month") {
                this.byId("currentInterval").setText(DateFormat.getDateInstance({pattern: "MMMM yyyy"}).format(oStartDate));
            }
        },
        
        _updateMiniCalendar: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            if (this.byId("miniCalendar")) {
                // this.byId("miniCalendar").setSelectedDate(oStartDate);
            }
        },
        
        _updateTimesheetSummary: function() {
            var oModel = this.getView().getModel();
            var aPeople = oModel.getProperty("/people");
            var iBillableHours = 0, iNonBillableHours = 0;
            
            aPeople.forEach(function(oPerson) {
                oPerson.appointments.forEach(function(oAppointment) {
                    var hours = (new Date(oAppointment.end) - new Date(oAppointment.start)) / (1000 * 60 * 60);
                    if (oAppointment.title.includes("Project Management")) iNonBillableHours += hours;
                    else iBillableHours += hours;
                });
            });
            
            var billableHours = Math.floor(iBillableHours);
            var billableMinutes = Math.round((iBillableHours - billableHours) * 60);
            var nonBillableHours = Math.floor(iNonBillableHours);
            var nonBillableMinutes = Math.round((iNonBillableHours - nonBillableHours) * 60);
            
            this.byId("billableText").setText("Billable time: " + billableHours + "h " + billableMinutes + "m");
            this.byId("nonBillableText").setText("Non-billable: " + nonBillableHours + "h " + nonBillableMinutes + "m");
        },
        
        _applyTeamsMonthViewStyling: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            oPlanningCalendar.removeStyleClass("teams-month-view");
            oPlanningCalendar.removeStyleClass("teams-week-view");
            oPlanningCalendar.removeStyleClass("teams-day-view");
            
            if (oPlanningCalendar.getViewKey() === "Month") {
                oPlanningCalendar.addStyleClass("teams-month-view");
                oPlanningCalendar.setAppointmentDisplay("Title"); // Show titles in month view
                oPlanningCalendar.setSingleRow(true); // Show only one row (person) at a time
            } else if (oPlanningCalendar.getViewKey() === "Week" || oPlanningCalendar.getViewKey() === "WorkWeek") {
                oPlanningCalendar.addStyleClass("teams-week-view");
            } else {
                oPlanningCalendar.addStyleClass("teams-day-view");
                oPlanningCalendar.setAppointmentDisplay("All");
                oPlanningCalendar.setSingleRow(false);
            }
        },
        
        _enableDragAndDrop: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            // oPlanningCalendar.setEnableAppointmentsDragAndDrop(true);
            // oPlanningCalendar.setEnableAppointmentsResize(true);
        },
        
        getUserRole: function() {
            return this.roles.manager;
        },
        
        onTodayPress: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var today = new Date();
            oPlanningCalendar.setStartDate(today);
            this.getView().getModel().setProperty("/startDate", today);
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            MessageToast.show("Navigated to today");
        },
        
        onPrevPress: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            var sViewKey = oPlanningCalendar.getViewKey();
            
            var oNewStartDate = new Date(oStartDate);
            if (sViewKey === "Day") oNewStartDate.setDate(oStartDate.getDate() - 1);
            else if (sViewKey === "WorkWeek") oNewStartDate.setDate(oStartDate.getDate() - 7);
            else if (sViewKey === "Week") oNewStartDate.setDate(oStartDate.getDate() - 7);
            else if (sViewKey === "Month") oNewStartDate.setMonth(oStartDate.getMonth() - 1);
            
            oPlanningCalendar.setStartDate(oNewStartDate);
            this.getView().getModel().setProperty("/startDate", oNewStartDate);
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
        },
        
        onNextPress: function() {
            var oPlanningCalendar = this.byId("planningCalendar");
            var oStartDate = oPlanningCalendar.getStartDate();
            var sViewKey = oPlanningCalendar.getViewKey();
            
            var oNewStartDate = new Date(oStartDate);
            if (sViewKey === "Day") oNewStartDate.setDate(oStartDate.getDate() + 1);
            else if (sViewKey === "WorkWeek") oNewStartDate.setDate(oStartDate.getDate() + 7);
            else if (sViewKey === "Week") oNewStartDate.setDate(oStartDate.getDate() + 7);
            else if (sViewKey === "Month") oNewStartDate.setMonth(oStartDate.getMonth() + 1);
            
            oPlanningCalendar.setStartDate(oNewStartDate);
            this.getView().getModel().setProperty("/startDate", oNewStartDate);
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
        },
        
        onDateSelect: function(oEvent) {
            var oSelectedDate = oEvent.getParameter("date");
            var oPlanningCalendar = this.byId("planningCalendar");
            var oViewSelect = this.byId("viewSelect");
            
            oPlanningCalendar.setStartDate(oSelectedDate);
            this.getView().getModel().setProperty("/startDate", oSelectedDate);
            
            oViewSelect.setSelectedKey("Day");
            oPlanningCalendar.setViewKey("Day");
            
            setTimeout(function() {
                oPlanningCalendar.rerender();
            }, 100);
            
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            
            var sFormattedDate = DateFormat.getDateInstance({pattern: "EEEE, MMMM d, yyyy"}).format(oSelectedDate);
            MessageToast.show("Showing schedule for: " + sFormattedDate);
        },
        
        onViewChange: function(oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oPlanningCalendar = this.byId("planningCalendar");
            oPlanningCalendar.setViewKey(sSelectedKey);
            
            var oStartDate = new Date();
            if (sSelectedKey === "Day") oPlanningCalendar.setStartDate(oStartDate);
            else if (sSelectedKey === "WorkWeek") {
                var dayOfWeek = oStartDate.getDay();
                var diff = oStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                oStartDate.setDate(diff);
                oPlanningCalendar.setStartDate(oStartDate);
            } else if (sSelectedKey === "Week") {
                var dayOfWeek = oStartDate.getDay();
                var diff = oStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                oStartDate.setDate(diff);
                oPlanningCalendar.setStartDate(oStartDate);
            } else if (sSelectedKey === "Month") {
                oStartDate.setDate(1);
                oPlanningCalendar.setStartDate(oStartDate);
                
                var oPersonSelect = this.byId("personSelect");
                if (oPersonSelect.getSelectedKey() === "all") {
                    var aPeople = this._oOriginalPeople;
                    if (aPeople.length > 0) {
                        oPersonSelect.setSelectedKey(aPeople[0].name);
                        this.onPersonChange({getParameter: function() { return {getKey: function() { return aPeople[0].name; }}; }});
                    }
                }
            }
            
            this.getView().getModel().setProperty("/startDate", oStartDate);
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            this._applyTeamsMonthViewStyling();
            oPlanningCalendar.setRowHeaderWidth("250px");
            MessageToast.show("View changed to: " + sSelectedKey);
        },
        
        onPersonChange: function(oEvent) {
            var sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel();
            
            if (sSelectedKey === "all") oModel.setProperty("/people", this._oOriginalPeople);
            else {
                var oSelectedPerson = this._oOriginalPeople.find(function(oPerson) {
                    return oPerson.name === sSelectedKey;
                });
                oModel.setProperty("/people", oSelectedPerson ? [oSelectedPerson] : []);
            }
            
            this._updateTimesheetSummary();
            MessageToast.show("Showing schedule for: " + (sSelectedKey === "all" ? "All Members" : sSelectedKey));
        },
        
        onAppointmentSelect: function(oEvent) {
            var oAppointment = oEvent.getParameter("appointment");
            if (oAppointment) {
                var hours = (oAppointment.getEndDate() - oAppointment.getStartDate()) / (1000 * 60 * 60);
                var colorInfo = oAppointment.getColor() === "#2B7D2B" ? " (Green - 8+ hours)" : oAppointment.getColor() === "#FFD700" ? " (Yellow - 7+ hours)" : " (Grey - less than 7 hours)";
                MessageToast.show("Selected: " + oAppointment.getTitle() + "\n" + hours.toFixed(1) + " hours" + colorInfo);
            }
        },
        
        handleAppointmentDragEnter: function(oEvent) {
            if (this.isAppointmentOverlap(oEvent, oEvent.getParameter("calendarRow"))) {
                oEvent.preventDefault();
            }
        },
        
        handleAppointmentDrop: function(oEvent) {
            var oAppointment = oEvent.getParameter("appointment"),
                oStartDate = oEvent.getParameter("startDate"),
                oEndDate = oEvent.getParameter("endDate"),
                oCalendarRow = oEvent.getParameter("calendarRow"),
                bCopy = oEvent.getParameter("copy"),
                sTitle = oAppointment.getTitle(),
                oModel = this.getView().getModel(),
                oAppBindingContext = oAppointment.getBindingContext(),
                oRowBindingContext = oCalendarRow.getBindingContext(),
                handleAppointmentDropBetweenRows = function() {
                    var aPath = oAppBindingContext.getPath().split("/");
                    var iIndex = aPath.pop();
                    var sRowAppointmentsPath = aPath.join("/");
                    
                    oRowBindingContext.getObject().appointments.push(
                        oModel.getProperty(oAppBindingContext.getPath())
                    );
                    
                    oModel.getProperty(sRowAppointmentsPath).splice(iIndex, 1);
                };

            if (bCopy) {
                var oProps = Object.assign({}, oModel.getProperty(oAppointment.getBindingContext().getPath()));
                oProps.start = oStartDate;
                oProps.end = oEndDate;

                oRowBindingContext.getObject().appointments.push(oProps);
            } else {
                oModel.setProperty("start", oStartDate, oAppBindingContext);
                oModel.setProperty("end", oEndDate, oAppBindingContext);

                if (oAppointment.getParent() !== oCalendarRow) {
                    handleAppointmentDropBetweenRows();
                }
            }

            oModel.refresh(true);
            this._updateTimesheetSummary();

            MessageToast.show(oCalendarRow.getTitle() + "'s '" + "Appointment '" + sTitle + "' now starts at \n" + oStartDate + "\n and end at \n" + oEndDate + ".");
        },
        
        handleAppointmentResize: function(oEvent) {
            var oAppointment = oEvent.getParameter("appointment"),
                oStartDate = oEvent.getParameter("startDate"),
                oEndDate = oEvent.getParameter("endDate");

            if (!this.isAppointmentOverlap(oEvent, oAppointment.getParent())) {
                MessageToast.show("Appointment '" + oAppointment.getTitle() + "' now starts at \n" + oStartDate + "\n and end at \n" + oEndDate + ".");

                oAppointment
                    .setStartDate(oStartDate)
                    .setEndDate(oEndDate);
                    
                var oBindingContext = oAppointment.getBindingContext();
                if (oBindingContext) {
                    var oModel = this.getView().getModel();
                    var sPath = oBindingContext.getPath();
                    oModel.setProperty(sPath + "/start", oStartDate);
                    oModel.setProperty(sPath + "/end", oEndDate);
                    
                    var iHours = (oEndDate - oStartDate) / (1000 * 60 * 60);
                    var sNewColor = this._getColorForHours(iHours);
                    oModel.setProperty(sPath + "/color", sNewColor);
                    
                    var currentInfo = oModel.getProperty(sPath + "/info");
                    var newInfo = currentInfo.replace(/\(\d+(\.\d+)? hours\)/, '(' + iHours.toFixed(1) + ' hours)');
                    oModel.setProperty(sPath + "/info", newInfo);
                    
                    oModel.refresh(true);
                    this._updateTimesheetSummary();
                }
            } else {
                MessageToast.show("As a manager you can not resize events if they overlap with another events");
            }
        },

        handleAppointmentCreate: function(oEvent) {
            var oStartDate = oEvent.getParameter("startDate"),
                oEndDate = oEvent.getParameter("endDate"),
                oPlanningCalendarRow = oEvent.getParameter("calendarRow"),
                oModel = this.getView().getModel(),
                sPath = oPlanningCalendarRow.getBindingContext().getPath();

            var iHours = (oEndDate - oStartDate) / (1000 * 60 * 60);
            var sColor = this._getColorForHours(iHours);
            
            var newAppointment = {
                title: this._formatTime(oStartDate) + " New Appointment",
                start: oStartDate,
                end: oEndDate,
                info: oPlanningCalendarRow.getTitle() + " - New appointment (" + iHours.toFixed(1) + " hours)",
                type: "Type06",
                tentative: false,
                color: sColor,
                icon: "sap-icon://appointment"
            };

            if (!this.isAppointmentOverlap(oEvent, oPlanningCalendarRow)) {
                oModel.getProperty(sPath).appointments.push(newAppointment);
                oModel.refresh(true);
                this._updateTimesheetSummary();
                MessageToast.show("New Appointment is created at \n" + oStartDate + "\n and end at \n" + oEndDate + ".");
            } else {
                MessageToast.show("Cannot create appointment due to overlap.");
            }
        },

        isAppointmentOverlap: function(oEvent, oCalendarRow) {
            var oAppointment = oEvent.getParameter("appointment"),
                oStartDate = oEvent.getParameter("startDate"),
                oEndDate = oEvent.getParameter("endDate"),
                bAppointmentOverlapped = false;

            if (this.getUserRole() === this.roles.manager) {
                bAppointmentOverlapped = oCalendarRow.getAppointments().some(function(oCurrentAppointment) {
                    if (oCurrentAppointment === oAppointment) {
                        return false;
                    }

                    var oAppStartTime = oCurrentAppointment.getStartDate().getTime(),
                        oAppEndTime = oCurrentAppointment.getEndDate().getTime();

                    if (oAppStartTime <= oStartDate.getTime() && oStartDate.getTime() < oAppEndTime) {
                        return true;
                    }

                    if (oAppStartTime < oEndDate.getTime() && oEndDate.getTime() <= oAppEndTime) {
                        return true;
                    }

                    if (oStartDate.getTime() <= oAppStartTime && oAppStartTime < oEndDate.getTime()) {
                        return true;
                    }
                    
                    return false;
                });
            }
            
            return bAppointmentOverlapped;
        },
        
        onRowHeaderPress: function(oEvent) {
            var oRow = oEvent.getParameter("row");
            var oBindingContext = oRow.getBindingContext();
            var oPerson = oBindingContext.getObject();
            this._showPersonDetailsDialog(oPerson);
        },
        
        _showPersonDetailsDialog: function(oPerson) {
            if (!this._oPersonDetailsDialog) {
                this._oPersonDetailsDialog = new Dialog({
                    title: "Person Details",
                    contentWidth: "500px",
                    content: [
                        new VBox({
                            items: [
                                new HBox({
                                    items: [
                                        new Label({text: "Name:", width: "100px"}),
                                        new Text({text: oPerson.name})
                                    ]
                                }).addStyleClass("sapUiSmallMarginBottom"),
                                new HBox({
                                    items: [
                                        new Label({text: "Role:", width: "100px"}),
                                        new Text({text: oPerson.role})
                                    ]
                                }).addStyleClass("sapUiSmallMarginBottom"),
                                new Label({text: "Appointments:"}).addStyleClass("sapUiSmallMarginTop"),
                                new VBox({items: this._createAppointmentItems(oPerson.appointments)})
                            ]
                        })
                    ],
                    beginButton: new Button({
                        text: "Close",
                        press: function() {
                            this._oPersonDetailsDialog.close();
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this._oPersonDetailsDialog);
            } else {
                var oContent = this._oPersonDetailsDialog.getContent()[0];
                var aItems = oContent.getItems();
                aItems[0].getItems()[1].setText(oPerson.name);
                aItems[1].getItems()[1].setText(oPerson.role);
                var oAppointmentContainer = aItems[3];
                oAppointmentContainer.destroyItems();
                this._createAppointmentItems(oPerson.appointments).forEach(function(oItem) {
                    oAppointmentContainer.addItem(oItem);
                });
            }
            this._oPersonDetailsDialog.open();
        },
        
        _createAppointmentItems: function(appointments) {
            var aItems = [];
            if (appointments && appointments.length > 0) {
                appointments.forEach(function(appointment) {
                    var startDate = new Date(appointment.start);
                    var endDate = new Date(appointment.end);
                    var hours = (endDate - startDate) / (1000 * 60 * 60);
                    aItems.push(new HBox({
                        items: [new Text({text: appointment.title + " (" + hours.toFixed(1) + " hours)", width: "100%"})]
                    }).addStyleClass("sapUiSmallMarginBottom"));
                });
            } else {
                aItems.push(new Text({text: "No appointments found"}));
            }
            return aItems;
        },
        
        onMiniCalendarMonthSelect: function(oEvent) {
            var oMonth = oEvent.getParameter("month");
            var oPlanningCalendar = this.byId("planningCalendar");
            
            var oStartDate = new Date(oMonth);
            oStartDate.setDate(1);
            oPlanningCalendar.setStartDate(oStartDate);
            
            oPlanningCalendar.setViewKey("Month");
            this.byId("viewSelect").setSelectedKey("Month");
            
            var oPersonSelect = this.byId("personSelect");
            if (oPersonSelect.getSelectedKey() === "all") {
                var aPeople = this._oOriginalPeople;
                if (aPeople.length > 0) {
                    oPersonSelect.setSelectedKey(aPeople[0].name);
                    this.onPersonChange({getParameter: function() { return {getKey: function() { return aPeople[0].name; }}; }});
                }
            }
            
            this._applyTeamsMonthViewStyling();
            oPlanningCalendar.setSingleRow(true);
            oPlanningCalendar.setRowHeaderWidth("250px");
            
            this._updateCurrentIntervalText();
            this._updateMiniCalendar();
            this._updateTimesheetSummary();
            
            MessageToast.show("Showing schedule for: " + DateFormat.getDateInstance({pattern: "MMMM yyyy"}).format(oMonth));
        }
    });
});



// controller.js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function(Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("com.view1.project1.controller.View1", {
        onInit: function() {
            // Sample data for the timesheet table
            var oData = {
                timesheets: [
                    {
                        date: "Mar 13, 2025",
                        member: "Pushpak Kumar Jha",
                        task: "Project Manager",
                        project: "Mahindra Cordys Project",
                        billing: "",
                        billingStatus: "Draft",
                        hours: "10:10:20"
                    },
                    {
                        date: "Mar 12, 2025",
                        member: "Tahmid Ahmed",
                        task: "Product Designer",
                        project: "Product Design",
                        billing: "$1520",
                        billingStatus: "Pending",
                        hours: "24:10:20"
                    },
                    {
                        date: "Mar 11, 2025",
                        member: "Towsif Mahmud",
                        task: "Web Developer",
                        project: "Real Estate Website",
                        billing: "$1520",
                        billingStatus: "Unbilled",
                        hours: "24:10:20"
                    },
                    {
                        date: "Mar 10, 2025",
                        member: "Suhel Ahmed",
                        task: "AI Engineer",
                        project: "AI Travel bot",
                        billing: "$1520",
                        billingStatus: "Pending",
                        hours: "15:20"
                    },
                    {
                        date: "Mar 09, 2025",
                        member: "Abdullah Mamun",
                        task: "Task Coordinator",
                        project: "Task Management",
                        billing: "$1520",
                        billingStatus: "Unbilled",
                        hours: "12:30"
                    },
                    {
                        date: "Mar 08, 2025",
                        member: "Sunny Ahmed",
                        task: "UI/UX Designer",
                        project: "Travel Trip UI Kit",
                        billing: "$1520",
                        billingStatus: "Paid",
                        hours: "20:00"
                    },
                    {
                        date: "Mar 07, 2025",
                        member: "Afif Hussain",
                        task: "Chatbot Developer",
                        project: "AI Chat",
                        billing: "$1520",
                        billingStatus: "Paid",
                        hours: "18:45"
                    }
                ]
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);

            // Additional initialization if needed
        },

        onStartTimer: function() {
            MessageToast.show("Timer started");
            // Implement timer start logic
        },

        onAddTag: function() {
            MessageToast.show("Add Tag functionality triggered");
            // Implement add tag
        },

        onInvoiceUnbilled: function() {
            MessageToast.show("Invoice Unbilled Hours triggered");
            // Implement invoicing
        },

        onAddTime: function() {
            MessageToast.show("Add Time functionality triggered");
            // Implement add time entry
        },

        onTilePress: function(oEvent) {
            MessageToast.show("Tile pressed: " + oEvent.getSource().getHeader());
            // Handle tile interactions
        },

        onMenuSelect: function(oEvent) {
            var sTitle = oEvent.getParameter("item").getTitle();
            MessageToast.show("Menu selected: " + sTitle);
            // Handle navigation to other views
        },

        onTabChange: function(oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            MessageToast.show("Tab changed to: " + sKey);
            // Handle tab content switch
        },

        onPreviousPage: function() {
            MessageToast.show("Previous page");
            // Implement pagination logic
        },

        onNextPage: function() {
            MessageToast.show("Next page");
            // Implement pagination logic
        }
    });
});
