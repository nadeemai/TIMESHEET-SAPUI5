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
