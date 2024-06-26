'use strict';

const path = require('path');
const wNumb = require('wnumb/wNumb')

const mspHelper = require('./../js/msp/MSPHelper');
const MSPCodes = require('./../js/msp/MSPCodes');
const MSP = require('./../js/msp');
const { GUI, TABS } = require('./../js/gui');
const FC = require('./../js/fc');
const i18n = require('./../js/localization');
const interval = require('./../js/intervals');

TABS.adjustments = {};

TABS.adjustments.initialize = function (callback) {
    GUI.active_tab_ref = this;
    GUI.active_tab = 'adjustments';

    MSP.send_message(MSPCodes.MSP_ADJUSTMENT_RANGES, false, false, get_rc_data);

    function get_rc_data() {
        MSP.send_message(MSPCodes.MSP_RC, false, false, load_html);
    }

    function load_html() {
        GUI.load(path.join(__dirname, "adjustments.html"), process_html);
    }

    function addAdjustment(adjustmentIndex, adjustmentRange, auxChannelCount) {

        var template = $('#tab-adjustments-templates').find('.adjustments .adjustment');
        var newAdjustment = template.clone();

        $(newAdjustment).attr('id', 'adjustment-' + adjustmentIndex);
        $(newAdjustment).data('index', adjustmentIndex);

        //
        // update selected slot
        //

        var channelList = $(newAdjustment).find('.adjustmentSlot .slot');
        channelList.val(adjustmentRange.slotIndex);

        //
        // populate source channel select box
        //

        var channelList = $(newAdjustment).find('.channelInfo .channel');
        var channelOptionTemplate = $(channelList).find('option');
        channelOptionTemplate.remove();
        for (var channelIndex = 0; channelIndex < auxChannelCount; channelIndex++) {
            var channelOption = channelOptionTemplate.clone();
            channelOption.text('CH ' + (channelIndex + 5));
            channelOption.val(channelIndex);
            channelList.append(channelOption);
        }
        channelList.val(adjustmentRange.auxChannelIndex);

        //
        // update selected function
        //

        var functionList = $(newAdjustment).find('.functionSelection .function');

        // update list of selected functions
        var functionListOptions = $(functionList).find('option');
        var availableFunctionCount = 59; // Set this to highest adjustment value + 1

        var functionListOptions = $(functionListOptions).slice(0,availableFunctionCount);
        //functionList.empty().append(functionListOptions);

        functionList.val(adjustmentRange.adjustmentFunction);



        //
        // populate function channel select box
        //

        var channelList = $(newAdjustment).find('.functionSwitchChannel .channel');
        var channelOptionTemplate = $(channelList).find('option');
        channelOptionTemplate.remove();
        for (var channelIndex = 0; channelIndex < auxChannelCount; channelIndex++) {
            var channelOption = channelOptionTemplate.clone();
            channelOption.text('CH ' + (channelIndex + 5));
            channelOption.val(channelIndex);
            channelList.append(channelOption);
        }
        channelList.val(adjustmentRange.auxSwitchChannelIndex);

        //
        // configure range
        //

        var channel_range = {
                'min': [  900 ],
                'max': [ 2100 ]
            };

        var defaultRangeValues = [1300, 1700];
        var rangeValues = defaultRangeValues;
        if (adjustmentRange.range != undefined) {
            rangeValues = [adjustmentRange.range.start, adjustmentRange.range.end];
        }

        var rangeElement = $(newAdjustment).find('.range');

        $(rangeElement).find('.channel-slider').noUiSlider({
            start: rangeValues,
            behaviour: 'snap-drag',
            margin: 50,
            step: 25,
            connect: true,
            range: channel_range,
            format: wNumb({
                decimals: 0
            })
        });

        $(newAdjustment).find('.channel-slider').Link('lower').to($(newAdjustment).find('.lowerLimitValue'));
        $(newAdjustment).find('.channel-slider').Link('upper').to($(newAdjustment).find('.upperLimitValue'));

        $(rangeElement).find(".pips-channel-range").noUiSlider_pips({
            mode: 'values',
            values: [900, 1000, 1200, 1400, 1500, 1600, 1800, 2000, 2100],
            density: 4,
            stepped: true
        });

        //
        // add the enable/disable behavior
        //

        var enableElement = $(newAdjustment).find('.enable');
        $(enableElement).data('adjustmentElement', newAdjustment);
        $(enableElement).on('change', function () {
            var adjustmentElement = $(this).data('adjustmentElement');
            if ($(this).prop("checked")) {
                $(adjustmentElement).find(':input').prop("disabled", false);
                $(adjustmentElement).find('.channel-slider').removeAttr("disabled");
                var rangeElement = $(adjustmentElement).find('.range .channel-slider');
                var range = $(rangeElement).val();
                if (range[0] == range[1]) {
                    var defaultRangeValues = [1300, 1700];
                    $(rangeElement).val(defaultRangeValues);
                }
            } else {
                $(adjustmentElement).find(':input').prop("disabled", true);
                $(adjustmentElement).find('.channel-slider').attr("disabled", "disabled");
            }

            // keep this element enabled
            $(this).prop("disabled", false);
        });

        var isEnabled = (adjustmentRange.range.start != adjustmentRange.range.end);
        $(enableElement).prop("checked", isEnabled).trigger('change');

        return newAdjustment;
    }

    function process_html() {

        var auxChannelCount = FC.RC.active_channels - 4;

        var modeTableBodyElement = $('.tab-adjustments .adjustments tbody')
        for (var adjustmentIndex = 0; adjustmentIndex < FC.ADJUSTMENT_RANGES.length; adjustmentIndex++) {
            var newAdjustment = addAdjustment(adjustmentIndex, FC.ADJUSTMENT_RANGES[adjustmentIndex], auxChannelCount);
            modeTableBodyElement.append(newAdjustment);
        }

        // translate to user-selected language
       i18n.localize();;

        // UI Hooks
        $('a.save').on('click', function () {

            // update internal data structures based on current UI elements
            var requiredAdjustmentRangeCount = FC.ADJUSTMENT_RANGES.length;

            FC.ADJUSTMENT_RANGES = [];

            var defaultAdjustmentRange = {
                slotIndex: 0,
                auxChannelIndex: 0,
                range: {
                    start: 900,
                    end: 900
                },
                adjustmentFunction: 0,
                auxSwitchChannelIndex: 0
            };

            $('.tab-adjustments .adjustments .adjustment').each(function () {
                var adjustmentElement = $(this);

                if ($(adjustmentElement).find('.enable').prop("checked")) {
                    var rangeValues = $(this).find('.range .channel-slider').val();
                    var adjustmentRange = {
                        slotIndex: parseInt($(this).find('.adjustmentSlot .slot').val()),
                        auxChannelIndex: parseInt($(this).find('.channelInfo .channel').val()),
                        range: {
                            start: rangeValues[0],
                            end: rangeValues[1]
                        },
                        adjustmentFunction: parseInt($(this).find('.functionSelection .function').val()),
                        auxSwitchChannelIndex: parseInt($(this).find('.functionSwitchChannel .channel').val())
                    };
                    FC.ADJUSTMENT_RANGES.push(adjustmentRange);
                } else {
                    FC.ADJUSTMENT_RANGES.push(defaultAdjustmentRange);
                }
            });

            for (var adjustmentRangeIndex = FC.ADJUSTMENT_RANGES.length; adjustmentRangeIndex < requiredAdjustmentRangeCount; adjustmentRangeIndex++) {
                FC.ADJUSTMENT_RANGES.push(defaultAdjustmentRange);
            }

            //
            // send data to FC
            //
            mspHelper.sendAdjustmentRanges(save_to_eeprom);

            function save_to_eeprom() {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                    GUI.log(i18n.getMessage('adjustmentsEepromSaved'));
                });
            }

        });

        function update_marker(auxChannelIndex, channelPosition) {
            if (channelPosition < 900) {
                channelPosition = 900;
            } else if (channelPosition > 2100) {
                channelPosition = 2100;
            }
            var percentage = (channelPosition - 900) / (2100-900) * 100;

            $('.adjustments .adjustment').each( function () {
                var auxChannelCandidateIndex = $(this).find('.channel').val();
                if (auxChannelCandidateIndex != auxChannelIndex) {
                    return;
                }

                $(this).find('.range .marker').css('left', percentage + '%');
            });
        }

        // data pulling functions used inside interval timer
        function get_rc_data() {
            MSP.send_message(MSPCodes.MSP_RC, false, false, update_ui);
        }

        function update_ui() {
            var auxChannelCount = FC.RC.active_channels - 4;

            for (var auxChannelIndex = 0; auxChannelIndex < auxChannelCount; auxChannelIndex++) {
                update_marker(auxChannelIndex, FC.RC.channels[auxChannelIndex + 4]);
            }
        }

        // update ui instantly on first load
        update_ui();

        // enable data pulling
        interval.add('aux_data_pull', get_rc_data, 50);

        GUI.content_ready(callback);
    }
};

TABS.adjustments.cleanup = function (callback) {
    if (callback) callback();
};
