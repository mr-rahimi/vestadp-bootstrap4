﻿
/* Vesta Date Picker */
(function () {
    var vestaDatePicker;
    vestaDatePicker = function (mainContainer, element, options) {
        if (typeof (mainContainer) == "undefined")
            return;
        var settings = $.extend({}, vestaDatePicker.defaultSettings, options),
            calendar = new window[settings.calendar + 'Calendar' ](),
            dateFormat = settings.dateFormat ? settings.dateFormat : calendar.defaultDateFormat,
            selectedJulianDay = 0,
            currentView = 0, // 0 = dayView; 1 = month view; 2 = year view
            startYear, endYear,
            minDateJd = dateToGregorianJd(settings.minDate),
            maxDateJd = dateToGregorianJd(settings.maxDate),
            container = $('<div></div>'),
            that = this;
        mainContainer.append(container).addClass('ui-vestadp-maincontainer')
                     .addClass(settings.showInline ? 'ui-vestadp-inline' : 'ui-vestadp-popup');
        bindEventHandlers();
        mouseWheelBinder(container);

        var clickHandlers = [
            {
                "next": function () {  calendar.addMonth(1); return true;   },
                "prev": function () {  calendar.addMonth(-1); return true;   },
                "view": function () {  renderMonth(settings); return false; },
                "date": function (args) {
                    calendar.setMonth(parseInt(args["month"]));
                    calendar.setDay(parseInt(args["day"]));
                    selectedJulianDay = calendar.getJulianDay();
                    var dateStr = calendar.toString(dateFormat);
                    settings.dateChanged(element, dateStr, calendar);
                    if (typeof (element) !== "undefined" && !settings.showInline) {
                        element.val(dateStr);
                        animate('close');
                    } else if (typeof (element) !== "undefined" && settings.showInline) {
                        $(".ui-vestadp-selected", container).removeClass("ui-vestadp-selected");
                        $(this).addClass("ui-vestadp-selected");
                    }     
                    return false;               
                },
                "after": function () {
                    $('.ui-vestadp-calendar', container).fadeOut("fast", function () {
                        renderDayView(settings);
                    });
                }
            },
            {
                "next": function () { calendar.addYear(1); return true; },
                "prev": function () { calendar.addYear(-1); return true; },
                "view": function (args) { 
                    if (args["view"] == "cal") {
                        calendar.setMonth(parseInt(args["month"]));
                        renderDayView(settings);
                        return;
                    } else if (args["view"] == "year")
                        renderYear(settings, calendar.year);
                    return false;             
                 },
                 "after": function (args) {
                    $('.ui-vestadp-calendar', container).fadeOut("fast", function () {
                        renderMonth(settings);
                    });
                 }
            }, 
            {
                "next": function () {
                    $('.ui-vestadp-calendar', container).fadeOut("fast", function () {
                        renderYear(settings, endYear + 4);
                    });
                },
                "prev": function () {
                    $('.ui-vestadp-calendar', container).fadeOut("fast", function () {
                        renderYear(settings, startYear - 7);
                    });
                },
                "view": function (args) {
                    if (args["view"] == "month") {
                        calendar.setYear(parseInt(args["year"]));
                        $('.ui-vestadp-calendar', container).fadeOut("fast", function () {
                            renderMonth(settings);
                        });
                        return;
                    }                    
                },
                "after": function () {  }
            }
        ];

        this.display = function (strDate, raiseChange) {
            if (typeof (strDate) === "undefined" || !strDate) {
                this.setDate(null, false, false);
                return;
            }

            try {
                var date = parseDate(dateFormat, strDate);
            } catch(ex){
                // do nothing when datestring cant be parsed
                return;
            }
            this.setDate(date, true, false);
            return;
        };

        this.getCalendar = function () {
            return calendar;
        };

        this.formatDate = formatDate;

        this.animate = animate;

        this.getOptions = function () {
            return settings;
        }

        this.minDate = function (mdate) {
            if (typeof(mdate)==='undefined') {
                return settings.minDate;
            }
            settings.minDate = mdate;
            minDateJd = dateToGregorianJd(settings.minDate);
            if (selectedJulianDay < minDateJd) {
                setCalendarJulianDay(minDateJd, true);
            }
            renderDayView(settings);
        }

        this.maxDate = function (mdate) {
            if (typeof(mdate)==='undefined') {
                return settings.maxDate;
            }            
            settings.maxDate = mdate;
            maxDateJd = dateToGregorianJd(settings.maxDate);
            if (selectedJulianDay > maxDateJd) {
                setCalendarJulianDay(maxDateJd, true);
            }
            renderDayView(settings);
        }

        this.getDate = function (cultured, dateF) {
            if (selectedJulianDay == 0){
                return null;
            }
            if (cultured) {
                dateF = typeof(dateF) !== "undefined" ? dateF : dateFormat;
                return calendar.toString(dateF);
            } else {
                var date = jdToGregorian(calendar.getJulianDay());
                return new Date(Date.UTC(date.year, date.month-1, date.day));
            }
        };

        this.setDate = function (date, cultured, raiseChange) {
            if (!date) {
                setCalendarJulianDay(0, raiseChange);
                return;
            }
            if ((!date.hasOwnProperty("year") && !date.hasOwnProperty("month") && !date.hasOwnProperty("day")))
                throw "argument exception, date";
            date.month = typeof (date.month) === "undefined" || isNaN(date.month.toString()) ? calendar.month : date.month;
            date.day = typeof (date.day) === "undefined" || isNaN(date.day.toString()) ? calendar.day : date.day;
            cultured = typeof(cultured) === "undefined" ? false : cultured;;
            if (cultured) {
                calendar.setDate(date.year, date.month, date.day);
                selectedJulianDay = calendar.getJulianDay();
            } else {
                selectedJulianDay = gregorianToJd(date.year, date.month, date.day);
            }
            setCalendarJulianDay(selectedJulianDay, raiseChange);
        };


        function setCalendarJulianDay(jd, raiseChange) {
            if (jd<minDateJd) {
                jd = minDateJd;
            } else if (maxDateJd && jd>maxDateJd){
                jd = maxDateJd;
            }
            selectedJulianDay = jd;
            calendar.setJulianDay(jd>0 ? jd:getTodayJulianDate());
            var dateStr = jd>0 ? calendar.toString(dateFormat): null;
            setElementValue(dateStr);
            if (raiseChange) {
                settings.dateChanged(element, dateStr, calendar);
            }            
            renderDayView(settings);
        }

        function setElementValue(val) {
            if (typeof (element) !== "undefined") {
                element.val(val);
            }
        }

        function displaywheel(e) {
            //equalize event object
            var evt = window.event || e;
            //check for detail first so Opera uses that instead of wheelDelta
            var delta = evt.detail ? evt.detail * (-120) : evt.wheelDelta;
            if (delta > 0) {
                switch (currentView) {
                    case 0:
                        calendar.addMonth(1);
                        renderDayView(settings);
                        break;
                    case 1:
                        calendar.addYear(1);
                        renderMonth(settings);
                        break;
                    case 2:
                        renderYear(settings, endYear + 4);
                        break;
                }
            } else {
                switch (currentView) {
                    case 0:
                        calendar.addMonth(-1);
                        renderDayView(settings);
                        break;
                    case 1:
                        calendar.addYear(-1);
                        renderMonth(settings);
                        break;
                    case 2:
                        renderYear(settings, startYear - 7);
                        break;
                }
            }
            //disable default wheel action of scrolling page
            if (evt.preventDefault)
                evt.preventDefault();
            else
                return false;
        }

        function mouseWheelBinder(elm) {
            //FF doesn't recognize mousewheel as of FF3.x
            var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel";
            elm = $(elm).get(0);
            if (elm.attachEvent) //if IE (and Opera depending on user setting)
                elm.attachEvent("on" + mousewheelevt, displaywheel);
            else if (elm.addEventListener) //WC3 browsers
                elm.addEventListener(mousewheelevt, displaywheel, false);
        }

        function getTodayJulianDate() {
            var today = new Date();
            return dateToGregorianJd(today);
        }
        
        function dateToGregorianJd(date) {
            if (!date) return null;
            if (typeof(date)==='string') date = new Date(date);
            return gregorianToJd(date.getFullYear(), date.getMonth() + 1, date.getDate());
        }

        function renderDayView(opts) {
            currentView = 0;
            $(container).empty().addClass("ui-vestadp-container");
            $(container).append(renderHeader(calendar.getMonthList()[calendar.month - 1] + " " + getNumber(calendar.year, opts.persianNumbers), 'view:month', opts));
            var calTable = $("<div></div>").addClass("ui-vestadp-calendar").css("direction", opts.direction).hide();
            var weekHeader = $("<div></div>").addClass('ui-vestadp-weekheader');
            var weekdays = calendar.getWeekdayList(true);
            for (var i = 0; i < weekdays.length; i++) {
                weekHeader.append($("<div></div>").addClass("ui-vestadp-weekday").text(weekdays[i]));
            }
            calTable.append(weekHeader);
            var jd = calendar.getJulianDay();
            calendar.goFirstOfMonth();
            var currentMonth = calendar.month,
            	firstdow = calendar.getWeekday(),
			    todayJd = getTodayJulianDate();

            calendar.addDay(-1 * firstdow);
            for (i = 0; i < 6; i++) {
                var wrow = $("<div></div>"),
                    cjd, wday;
                for (var j = 0; j < 7; j++) {
                    cjd = calendar.getJulianDay();
                    wday = $("<div data-event='click' data-handler='date'></div>")
                                .attr('data-args',"day:" + calendar.day + ",month:" + calendar.month + ",jd:"+cjd)
                                .addClass("ui-vestadp-day").text(getNumber(calendar.day, opts.persianNumbers));
                    
                    if (calendar.month != currentMonth)
                        wday.addClass("ui-vestadp-inactive");
                    if ( cjd == selectedJulianDay)
                        wday.addClass("ui-vestadp-selected");
                    if ( cjd == todayJd && (todayJd>=minDateJd && (!maxDateJd || maxDateJd>=todayJd)))
                        wday.addClass('ui-vestadp-today');
                    if ((minDateJd && minDateJd > cjd) || (maxDateJd && maxDateJd < cjd))
                        wday.attr('disabled', 'disabled');
                    wrow.append(wday);
                    calendar.addDay(1);
                }
                calTable.append(wrow);
            }
            calendar.setJulianDay(jd);
            $(container).append(calTable);
            if (opts.showFooter && !opts.showInline){
                $(container).append(renderFooter(element, opts));
            }
            calTable.fadeIn();
        }

        function bindEventHandlers() {
            $(container).on('click','[data-event="click"]',function () {
                if ($(this).attr('disabled')) return;
                var handler = $(this).attr("data-handler");
                var args = parseArgs($(this).attr("data-args"));
                var runAfter = clickHandlers[currentView][handler].call(this,args);
                if (runAfter) {
                    clickHandlers[currentView]["after"].call(this,args);
                }
            });   

            swipedetect(container[0], function (direction) {
                if (direction=='none') return true;
                
                var runAfter = clickHandlers[currentView][direction=='right' ? 'next' : 'prev'].call(this);
                if (runAfter) {
                    clickHandlers[currentView]['after'].call(this);
                }
            });   
        }

        function renderHeader(title, args, opts) {
            var header = $('<div></div>').addClass('ui-vestadp-header');
            header.append($("<div data-event='click' data-handler='prev'></div>").addClass("ui-vestadp-prev").attr("title", opts.regional[opts.language].previous).text("«"));
            header.append($("<div data-event='click' data-handler='view' data-args='" + args + "'></div>").addClass("ui-vestadp-title").text(title));
            header.append($("<div data-event='click' data-handler='next'></div>").addClass("ui-vestadp-next").attr("title", opts.regional[opts.language].next).text("»"));
            return header;
        }

        function renderFooter(elm, opts) {
            var footer = $('<div></div>').addClass('ui-vestadp-footer');
            footer.append($("<div></div>").addClass("ui-vestadp-today-btn").text(opts.regional[opts.language].today).click(function () {
                setCalendarJulianDay(getTodayJulianDate());
                animate('close');
            }));
            footer.append($("<div></div>").addClass("ui-vestadp-clear").text(opts.regional[opts.language].clear).click(function () {
                setCalendarJulianDay(0, true);
                animate('close');
            }));
            return footer;
        }

        function renderMonth(opts) {
            currentView = 1;
            $(container).empty().addClass("ui-vestadp-container");
            $(container).append(renderHeader(getNumber(calendar.year, opts.persianNumbers), 'view:year', opts));
            var calTable = $("<table cellspacing='1'></table>").addClass("ui-vestadp-calendar").css("direction", opts.direction).hide();
            var mIndex = 0;
            var months = calendar.getMonthList(true);
            for (var i = 0; i < 3; i++) {
                var mrow = $("<tr></tr>").addClass("ui-vestadp-monthlist");
                for (var j = 0; j < 4; j++) {
                    var mcell = $("<td data-event='click' data-handler='view' data-args='view:cal,month:" + (mIndex + 1) + "'></td>").text(months[mIndex]);
                    if (calendar.month == mIndex + 1)
                        mcell.addClass("ui-vestadp-selected");
                    mrow.append(mcell);
                    mIndex++;
                }
                calTable.append(mrow);
            }
            $(container).append(calTable);
            if (opts.showFooter && !opts.showInline) {
                $(container).append(renderFooter(element, opts));
            }
            calTable.fadeIn();
        }


        function renderYear(opts, year) {
            currentView = 2;
            $(container).empty().addClass("ui-vestadp-container");

            var calTable = $("<table cellspacing='1'></table>").addClass("ui-vestadp-calendar").css("direction", "ltr").hide();

            startYear = year - 4;
            endYear = year + 7;
            year = startYear;
            $(container).append(renderHeader(getNumber(startYear, opts.persianNumbers) + " - " + getNumber(endYear, opts.persianNumbers), '', opts));

            for (var i = 0; i < 3; i++) {
                var yrow = $("<tr></tr>").addClass("ui-vestadp-yearlist");
                for (var j = 0; j < 4; j++) {
                    var ycell = $("<td data-event='click' data-handler='view' data-args='view:month,year:" + year + "'></td>").text(getNumber(year, opts.persianNumbers));
                    if (calendar.year == year)
                        ycell.addClass("ui-vestadp-selected");
                    yrow.append(ycell);
                    year++;
                }
                calTable.append(yrow);
            }
            $(container).append(calTable);
            if (opts.showFooter && !opts.showInline) {
                $(container).append(renderFooter(element, opts));
            }
            calTable.fadeIn();
        }
        

        // to parse argument lists passed to clickable objects
        function parseArgs(args) {
            if (typeof (args) === "undefined")
                return undefined;
            args = args.split(',');
            var argsArray = new Array();
            for (var i = 0; i < args.length; i++) {
                var argsParts = args[i].split(':');
                argsArray[argsParts[0]] = argsParts[1];
            }
            return argsArray;
        }

        /* converts a number to its persian form if needed (unicode=true) */
        function getNumber(num, unicode) {
            if (!unicode || parseInt(num) < 0 || typeof (num) === "undefined")
                return num;
            if (parseInt(num) < 10)
                return String.fromCharCode(1632 + parseInt(num));
            var numStr = "";
            for (var i = 0; i < num.toString().length; i++) {
                numStr += getNumber(num.toString().charAt(i), true);
            }
            return numStr;
        }

        function gregorianToJd(year, month, day) {
            var GREGORIAN_EPOCH = 1721425.5;
            return (GREGORIAN_EPOCH - 1) +
                   (365 * (year - 1)) +
                   Math.floor((year - 1) / 4) +
                   (-Math.floor((year - 1) / 100)) +
                   Math.floor((year - 1) / 400) +
                   Math.floor((((367 * month) - 362) / 12) +
                   ((month <= 2) ? 0 : ((((year % 4) == 0) && (!(((year % 100) == 0) && ((year % 400) != 0)))) ? -1 : -2)) + day);
        }

        function jdToGregorian(jd) {
            var wjd, depoch, quadricent, dqc, cent, dcent, quad, dquad,
                yindex, month, day, year, yearday, leapadj;

            var GREGORIAN_EPOCH = 1721425.5;
            wjd = Math.floor(jd - 0.5) + 0.5;
            depoch = wjd - GREGORIAN_EPOCH;
            quadricent = Math.floor(depoch / 146097);
            dqc = mod(depoch, 146097);
            cent = Math.floor(dqc / 36524);
            dcent = mod(dqc, 36524);
            quad = Math.floor(dcent / 1461);
            dquad = mod(dcent, 1461);
            yindex = Math.floor(dquad / 365);
            year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex;
            if (!((cent == 4) || (yindex == 4))) {
                year++;
            }
            var isLeap = ((year % 4) == 0) && (!(((year % 100) == 0) && ((year % 400) != 0)));
            yearday = wjd - gregorianToJd(year, 1, 1);
            leapadj = ((wjd < gregorianToJd(year, 3, 1)) ? 0 : (isLeap ? 1 : 2));
            month = Math.floor((((yearday + leapadj) * 12) + 373) / 367);
            day = (wjd - gregorianToJd(year, month, 1)) + 1;

            return { year: year, month: month, day: day };
        }

        function mod(a, b) {
            return a - (b * Math.floor(a / b));
        };


        /**
        * Formats the input Javascript Date object to given format string or current datepicker format
        * @param {Date} date Input javascript Date object
        * @param {string} dateF Date format string
        */
        function formatDate(date, dateF) {
            if (!(date instanceof Date)) return null;
            dateF = typeof(dateF) !== "undefined" ? dateF : dateFormat;
            var dateJd = dateToGregorianJd(date);
            var cal = new window[settings.calendar + 'Calendar' ]();
            cal.setJulianDay(dateJd);
            return cal.toString(dateF);
        }
            
        function animate(dir) {
            var cmd = {
                slide : { open : 'slideDown', close: 'slideUp' },
                fade : { open : 'fadeIn', close: 'fadeOut' }
            }
            $(mainContainer)[cmd[settings.animation][dir]]();
        }

        function parseDate(format, value) {
            if (format == null || value == null) {
                throw "Invalid arguments";
            }

            value = (typeof value === "object" ? value.toString() : value + "");
            if (value === "") {
                return null;
            }

            var iFormat, dim, extra,
                iValue = 0,
			    shortYearCutoff = 10,
                dayNamesShort = calendar.getWeekdayList(true),
                dayNames = calendar.getWeekdayList(false),
                monthNamesShort = calendar.getMonthList(true),
                monthNames = calendar.getMonthList(false),
                year = -1,
                month = -1,
                day = -1,
                doy = -1,
                literal = false,
                date,
                // Check whether a format character is doubled
                lookAhead = function (match) {
                    var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) === match);
                    if (matches) {
                        iFormat++;
                    }
                    return matches;
                },
                // Extract a number from the string value
                getNumber = function (match) {
                    var isDoubled = lookAhead(match),
                        size = (match === "@" ? 14 : (match === "!" ? 20 :
                        (match === "y" && isDoubled ? 4 : (match === "o" ? 3 : 2)))),
                        digits = new RegExp("^\\d{1," + size + "}"),
                        num = value.substring(iValue).match(digits);
                    if (!num) {
                        throw "Missing number at position " + iValue;
                    }
                    iValue += num[0].length;
                    return parseInt(num[0], 10);
                },
                // Extract a name from the string value and convert to an index
                getName = function (match, shortNames, longNames) {
                    var index = -1,
                        names = $.map(lookAhead(match) ? longNames : shortNames, function (v, k) {
                            return [[k, v]];
                        }).sort(function (a, b) {
                            return -(a[1].length - b[1].length);
                        });

                    $.each(names, function (i, pair) {
                        var name = pair[1];
                        if (value.substr(iValue, name.length).toLowerCase() === name.toLowerCase()) {
                            index = pair[0];
                            iValue += name.length;
                            return false;
                        }
                    });
                    if (index !== -1) {
                        return index + 1;
                    } else {
                        throw "Unknown name at position " + iValue;
                    }
                },
                // Confirm that a literal character matches the string value
                checkLiteral = function () {
                    if (value.charAt(iValue) !== format.charAt(iFormat)) {
                        throw "Unexpected literal at position " + iValue;
                    }
                    iValue++;
                };

            for (iFormat = 0; iFormat < format.length; iFormat++) {
                if (literal) {
                    if (format.charAt(iFormat) === "'" && !lookAhead("'")) {
                        literal = false;
                    } else {
                        checkLiteral();
                    }
                } else {
                    switch (format.charAt(iFormat)) {
                        case "d":
                            day = getNumber("d");
                            break;
                        case "D":
                            getName("D", dayNamesShort, dayNames);
                            break;
                        case "o":
                            doy = getNumber("o");
                            break;
                        case "m":
                            month = getNumber("m");
                            break;
                        case "M":
                            month = getName("M", monthNamesShort, monthNames);
                            break;
                        case "y":
                            year = getNumber("y");
                            break;
                        case "'":
                            if (lookAhead("'")) {
                                checkLiteral();
                            } else {
                                literal = true;
                            }
                            break;
                        default:
                            checkLiteral();
                    }
                }
            }

            if (iValue < value.length) {
                extra = value.substr(iValue);
                if (!/^\s+/.test(extra)) {
                    throw "Extra/unparsed characters found in date: " + extra;
                }
            }

            if (year === -1) {
                year = this.year;
            } else if (year < 100) {
                year += this.year - this.year % 100 +
                    (year <= shortYearCutoff ? 0 : -100);
            }

            if (doy > -1) {
                month = 1;
                day = doy;
                do {
                    dim = calendar.getDaysInMonth(year, month);
                    if (day <= dim) {
                        break;
                    }
                    month++;
                    day -= dim;
                } while (true);
            }

            return { year: year, month: month, day: day };
        }
    };

    function swipedetect(el, callback){
    
        var touchsurface = el,
        swipedir,
        startX,
        startY,
        distX,
        distY,
        threshold = 150, //required min distance traveled to be considered swipe
        restraint = 100, // maximum distance allowed at the same time in perpendicular direction
        allowedTime = 300, // maximum time allowed to travel that distance
        elapsedTime,
        startTime,
        handleswipe = callback || function(swipedir){}
    
        touchsurface.addEventListener('touchstart', function(e){
            var touchobj = e.changedTouches[0]
            swipedir = 'none'
            dist = 0
            startX = touchobj.pageX
            startY = touchobj.pageY
            startTime = new Date().getTime() // record time when finger first makes contact with surface
            //e.preventDefault()
        }, false)
    
        touchsurface.addEventListener('touchmove', function(e){
            e.preventDefault() // prevent scrolling when inside DIV
        }, false)
    
        touchsurface.addEventListener('touchend', function(e){
            var touchobj = e.changedTouches[0]
            distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
            distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
            elapsedTime = new Date().getTime() - startTime // get time elapsed
            if (elapsedTime <= allowedTime){ // first condition for awipe met
                if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
                    swipedir = (distX < 0)? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
                }
                else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
                    swipedir = (distY < 0)? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
                }
            }
            handleswipe(swipedir)
            //e.preventDefault()
        }, false)
    }

    vestaDatePicker.defaultSettings = {
        direction: "rtl",
        dateFormat: "", // default dateFromat of each calendar
        showFooter: true,
        persianNumbers: true,
        regional: {
            "fa": {
                today: "امروز",
                clear: "پاکن",
                previous: "قبلی",
                next: "بعدی"
            },
            "en": {
                today: "Today",
                clear: "Clear",
                previous: "Previous",
                next: "Next"
            },
            "ar": {
                today: "الیوم",
                clear: "واضح",
                previous: "سابق",
                next: "التالی"
            }
        },
        language: 'fa',
        calendar: "persian", // [gregorian & persian & hijri] are available.
        dateChanged: function () { },
        minDate: null,
        maxDate: null,
        animation: 'fade',
        showInline: false
    };

    window.VestaDatePicker = vestaDatePicker;
})();


(function ($) {
    $.fn.vestadp = function (method) {
        var methods = {
            init: function (options) {
                var opts = $.extend({}, VestaDatePicker.defaultSettings, options);
                return this.each(function (index, element) {
                    if ($(element).is(":text"))
                        methods._renderTextbox(element, opts);
                    else
                        methods._renderInline(element, opts);
                });
            },
            minDate: function (value) {
                var vdp = methods._checkThrow(this);
                return vdp.minDate(value);
            },
            maxDate: function (value) {
                var vdp = methods._checkThrow(this);
                return vdp.maxDate(value);
            },
            /**
             * Format javascript date object to desigred dateFormat string
             */
            formatDate: function (date, dateFormat) {
                var vdp = methods._checkThrow(this);
                return vdp.formatDate(date, dateFormat);
            },
            /*
                Selected date of date picker,
                (1)cultured: if cultured is true it returns selected date
                in according to selected calendar and dateFormat, if not it returns a normal
                javascript Date object which is gregorian in default system culture
                (2)dateFormat: if cultured is set this will be used as formatting string
            */
            getDate: function (cultured,dateFormat) {
                var vdp = methods._checkThrow(this);
                return vdp.getDate(cultured, dateFormat);
            },
            /*
                Set selected date of the date picker
                (1)date: is an object consisting a least one of the "year","month","day" properties for selected date
                (2)cultured: defines if entered date is in cultured system or default gregorian system
            */
            setDate: function (date, cultured) {
                var vdp = methods._checkThrow(this);
                return vdp.setDate(date, cultured, true);
            },
            /// checks whethear this element is already datepickerized or not
            _check: function (elm) {
                return $(elm).data("vestadp");
            },
            /// first does _check, if false, throws an exception
            _checkThrow: function (elm) {
                var vdp = methods._check(elm);
                if (typeof (vdp) === "undefined")
                    throw "Not vesta datepickerized yet!";
                return vdp;
            },
            _renderInline: function (element, opts) {
                if (methods._check())
                    return;
                // if user wants to run it over a DOM other than textbox showInline must be enabled
                opts.showInline = true;
                var divContainer = $("<div />").attr("data-rel", "vestadatepicker-inline");
                divContainer.appendTo("body");
                var vdp = new VestaDatePicker(divContainer, $(element), opts);
                $(element).data("vestadp", vdp);
                vdp.display();

                $(element).append(divContainer);
            },
            _renderTextbox: function (element, opts) {
                if (methods._check())
                    return;
                // if user wants to run it over a textbox showInline must be disabled
                opts.showInline = false;
                var divContainer = $("<div />").attr("data-rel", "vestadatepicker").css("position", "absolute");
                divContainer.appendTo("body");
                var vdp = new VestaDatePicker(divContainer, $(element), opts),
                    options = vdp.getOptions();
                $(element).data("vestadp", vdp);
                divContainer.hide();
                vdp.display($(element).val(), false);

                $(element).focus(function () {
                    vdp.display($(this).val(), false);
                    $("div[data-rel='vestadatepicker']").fadeOut("fast");
                    var offset = $(this).offset();
                    var elmWidth = $(this).outerWidth();
                    if (options.direction=="rtl")
                        left = offset.left - (divContainer.outerWidth() - $(this).outerWidth()) +"px"
                    else
                        left = offset.left + "px";
                    vdp.animate('open');
                    divContainer.css({
                        position: "absolute",
                        top: offset.top+$(this).outerHeight()+"px",
                        left: left
                    });

                })
                .on('input propertychange paste',function(){
                    vdp.display($(this).val(), true);
                })
                .click(function (ev) {
                    ev.stopPropagation();
                });

                divContainer.click(function (ev) {
                    ev.stopPropagation();
                });

                $(document).click(function () {
                    vdp.animate('close');
                });
            }
        };

        // Method calling logic
        if (methods[method] && method.charAt(0) != '_') {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.vestadp');
        }
    };

})(jQuery);
