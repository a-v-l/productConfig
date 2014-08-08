window.ProCONFIG = ( function (window, document, $, undefined) {

    'use strict';

    // Polyfill for Array.prototype.forEach
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach#Polyfill
    Array.prototype.forEach||(Array.prototype.forEach=function(c,f){var d,a;if(null==this)throw new TypeError(" this is null or not defined");var b=Object(this),g=b.length>>>0;if("function"!==typeof c)throw new TypeError(c+" is not a function");1<arguments.length&&(d=f);for(a=0;a<g;){var e;a in b&&(e=b[a],c.call(d,e,a,b));a++}});

    //
    // VARIABLES
    //

    var items,
        items_original,
        existing_form_original,
        presets,
        config;

    // Object for public APIs
    var exports = {};

    exports.order = {
            items: [],
            total: 0
        };

    //
    // METHODS
    //

    var renderGroup = function (group) {

        // Create groupContainer
        $("#configurator").append( '<div id="' + group + '" class="' +
                items[group].classes + ' active">' );
        var groupContainer = $('#'+ group),
            max = items[group].items.length,
            i, item;

        // Append group description
        groupContainer.append( '<h3>' + items[group].title + '</h3><p>' +
                items[group].description + '</p><div class="items">' );

        // Append items
        for (i = 0; i < max; i += 1) {
            item = items[group].items[i];
            groupContainer.find('.items').append('<div class="item" data-childgroup="' +
                    item.childgroup + '" data-price="' + item.price +
                    '" data-preset="' + item.preset + '" data-id="' + item.id + '"><h4>' +
                    item.name + '</h4><div class="item-img"><img src="' + config.imgItem +
                    '/' + group + "_" + item.id + '.jpg"></div><p class="description">' +
                    item.description + '</p><p class="price">' + toEuro(item.price) +
                    '</p></div>');
        }

        // Append group back button
        if (group !== config.firstGroup) {
            groupContainer.append('<div class="undo"><button class="back-button" data-parentgroup="' +
                    groupContainer.prev().prop('id') + '">' + config.i18n.back +
                    '</button><button class="cancel-button">' + config.i18n.reset +
                    '</button></div>');
            groupContainer.find('.back-button').on('click', unselectItem);
            groupContainer.find('.cancel-button').on('click', exports.reset);
        }

        // Check whether there are multiple items.
        // If so, append eventhandler
        // otherwise (->preset) move on to next childgroup
        if (max > 1) {

            // Append eventhandler
            groupContainer.find('.item').on('click', selectItem);

        } else {

            selectItem( groupContainer.find('.item')[0] );

        }

    };

    var selectItem = function (el) {

        var button = el.type !== undefined ? $(this) : $(el),
            nextGroup = button.data('childgroup'),
            preset = button.data('preset'),
            parent = button.parent().parent();

        // Mark as selected and remove eventhandler
        button.addClass('selected');
        parent.addClass('done').removeClass('active')
            .find('.item').off('click');

        // Save selection to order
        exports.order.items.push({
            group: parent.prop('id'),
            item: button.find('h4').text(),
            price: button.data('price')
        });

        exports.order.total += button.data('price');

        // Print total
        $('#selection .amount').text( toEuro( exports.order.total ) );

        // Load new main image
        $('#selection .image-stack').append('<img src="' + config.imgMain + '/' +
                parent.prop('id') + "_" + button.data('id') +
                '.png">');

        // Load preset if any
        if (preset !== null) {
            mergePreset(preset);
        }

        // Callback (Arguments: Group, Item, Price)
        if ( config.cbSelect !== undefined && typeof config.cbSelect === 'function' ) {
            config.cbSelect( parent.prop('id'), button.find('h4').text(), button.data('price') );
        }

        // Move on to next group
        if (nextGroup !== 'contact') {
            renderGroup(nextGroup);
        } else {
            injectForm();
        }

    }

    // One step back
    var unselectItem = function () {

        var previousGroup = $(this).data('parentgroup');
        $(this).parent().parent().add('#' + previousGroup).remove();

        // clean up `order` object
        exports.order.items.pop();
        exports.order.total = 0;
        exports.order.items.forEach( function (selected_item) {
            exports.order.total += selected_item.price;
        });

        // restore `items` *** PROVISIONAL SOLUTION ***
        items = JSON.parse(JSON.stringify(items_original));

        // restore `#selection`
        var total = toEuro( exports.order.total );
        total = total === config.i18n.included ? "<span>0,00 €</span>" : total;
        $('#selection .amount').html( total );
        $('#selection .image-stack img').last().remove();

        renderGroup(previousGroup);

        // Callback (Arguments: previousGroup)
        if ( config.cbUnSelect !== undefined && typeof config.cbUnSelect === 'function' ) {
            config.cbUnSelect( previousGroup );
        }

    }

    var mergePreset = function (preset) {

        // Walk only groups in `items` present in `presets[preset]`
        for (var group in items) {
            if (items.hasOwnProperty(group) && presets[preset][group] !== undefined) {

                var new_items = [];
                presets[preset][group].forEach( function (item_to_keep, index) {

                    items[group].items.forEach( function (existing_item) {

                        // Copy only those items named in `presets[preset][group]`
                        if (existing_item.name === item_to_keep) {
                            new_items[index] = existing_item;
                        }

                    });

                });
                // Replace original items with preset items
                items[group].items = new_items;

            };
        }
    }

    // Take existing order form from page and append it to the configurator
    var injectForm = function() {

        // move existing form to configurator or use deep copy
        var existing_form;
        if ( existing_form_original === undefined ) {
            existing_form_original = $( config.existingForm ).clone( true );
            $( config.existingForm ).remove();
        }
        existing_form = existing_form_original.clone( true );

        $("#configurator").append('<div>').find('div').last().append(existing_form);
        $('#configurator').find('input[type="submit"]')
                .after('<button class="reset-config">' + config.i18n.reset + '</button>');
        $('#configurator').find('form').find('.reset-config').on('click', exports.reset);

        // fill hidden field with pretty order details
        var pretty_order = '\n---------------------------------------\n',
            i,
            max;
        for ( i = 0, max = exports.order.items.length; i < max; i += 1) {
            // group
            pretty_order += items[ exports.order.items[i].group ].title + ": ";
            // item
            pretty_order += exports.order.items[i].item;
            // price
            pretty_order += " (" + toEuro( exports.order.items[i].price ) + ")\n";
        }
        // total
        pretty_order += '---------------------------------------\n'
        pretty_order += config.i18n.total + ": " + toEuro( exports.order.total );
        $( config.hiddenField ).val( pretty_order );
    }

    var toEuro = function (amount) {
        var euro = amount.toString();
        euro = euro.indexOf('.') !== -1 ? euro.replace(/\.(\d{1,2})(.*)/, ',$1') : euro + ',00';
        euro = euro.substr(-3,1) === ',' ? euro : euro + "0";
        euro = euro === "0,00" ? config.i18n.included : euro + " €";
        return euro;
    };

    var hoverMove = function () {
        var thisElem = $('#selection .hover-move');
        var thisElemWidth = thisElem.width();
        var thisElemHeight = thisElem.height();

        thisElem.mouseenter( function(){
            thisElem.on('mousemove', function (e) {
                var mouseX = e.pageX - thisElem.offset().left;
                var mouseY = e.pageY - thisElem.offset().top;
                thisElem.find('img').css({
                  // Adding 15px border left & right
                  'left': -(mouseX / thisElemWidth * (thisElemWidth + 30)) + "px",
                  // Adding 25px border top & bottom
                  'top':  -(mouseY / thisElemHeight * (thisElemHeight + 50)) + "px"
                });
            });
        }).mouseleave( function () {
            thisElem.find('img').css({
                  'left': 0,
                  'top':  0
                });
        });
    }

    exports.init = function (user_config) {

        config = user_config;
        // config.shop:         id of container to render the shop
        // config.firstGroup:   first group to be displayed
        // config.imgMain:      path to main images (.PNG)
        // config.imgItem:      path to item images (.JPG)
        // config.items:        json file with items
        // config.presets:      json file with presets
        // config.existingForm: form on page to append to configurator
        // config.hiddenField:  field to fill order details
        // config.cbSelect:     optional callback on selectItem (Arguments: Group, Item, Price)
        // config.cbUnSelect:   optional callback on unselectItem
        // config.cbReset:      optional callback on reset
        // config.hoverMove:    (bolean) enable zoom function
        // config.i18n:         object containing translation

        // default captions
        config.hoverMove = config.hoverMove || false;
        config.i18n = config.i18n || {};
        config.i18n.back = config.i18n.back || "One step back";
        config.i18n.shipping = config.i18n.shipping || "* VAT included, plus shipping";
        config.i18n.included = config.i18n.included || "included";
        config.i18n.total = config.i18n.total || "total";
        config.i18n.reset = config.i18n.reset || "Reset";
        config.i18n.reset_msg = config.i18n.reset_msg || "Note: The complete selection will be reset!";

        // render shop
        var shop = '<div id="selection" class="grid3">' +
                '<div class="image-stack' + (config.hoverMove?' hover-move':'') + '">' +
                '<img src="' + config.imgMain + '/' + config.firstGroup + '.png" />' +
                '</div><div class="total"><p class="amount"><span>0,00 €</span></p>' +
                ( config.i18n.shipping ?
                    '<p class="shipping">' +
                    config.i18n.shipping +'</p>' : '' ) +
                '</div></div>' +
                '<div id="configurator" class="grid9"></div>';
        $('#' + config.shop).append( shop );

        // Load items
        $.getJSON( config.items, function( item_data ) {

            items = item_data;
            // create deep copy of `items` for reset
            items_original = JSON.parse(JSON.stringify(items));

            // Load presets
            $.getJSON( config.presets, function( preset_data ) {

                presets = preset_data;
                renderGroup(config.firstGroup);
                if ( config.hoverMove ) {
                    hoverMove();
                }

            }).fail(function() {
                console.log( "ERROR: Failed to load \"" + config.presets + "\"" );
            });

        }).fail(function() {
            console.log( "ERROR: Failed to load \"" + config.items + "\"" );
        });

    };

    exports.reset = function (e) {
        e.preventDefault();
        if ( window.confirm( config.i18n.reset_msg ) ) {
            items = JSON.parse(JSON.stringify(items_original));
            exports.order = { items: [], total: 0 };
            $('#selection .amount').html('<span>0,00 €</span>');
            $('#configurator').html('');
            $('#selection .image-stack').html('<img src="' + config.imgMain +
                    '/' + config.firstGroup + '.png" />');

            // Callback
            if ( config.cbReset !== undefined && typeof config.cbReset === 'function' ) {
                config.cbReset();
            }

            renderGroup(config.firstGroup);
        }
    };

    return exports;

})(window, document, jQuery);
