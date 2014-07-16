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
        presets,
        order = {
            items: [],
            total: 0
        },
        config;

    //var group_height = 0; // Mal sehen…

    // Object for public APIs
    var exports = {};

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
        groupContainer.append( '<h2>' + items[group].title + '</h2><p>' +
                items[group].description + '</p><div class="items">' );

        // Append items
        for (i = 0; i < max; i += 1) {
            item = items[group].items[i];
            groupContainer.find('.items').append('<div class="item" data-childgroup="' +
                    item.childgroup + '" data-price="' + item.price +
                    '" data-preset="' + item.preset + '"><h3>' +
                    item.name + '</h3><div class="item-img"><img src="image_items/' +
                    group+"_"+item.name.replace(/[ \/]/g, "_") +
                    '.jpg"></div><p class="description">' + item.description +
                    '</p><p class="price">' + toEuro(item.price) + '</p></div>');
        }

        // Append group back button
        if (group !== config.firstGroup) {
            groupContainer.append('<button class="back-button" data-parentgroup="' +
                    groupContainer.prev().prop('id') + '">einen Schritt zurück</button>');
            groupContainer.find('.back-button').on('click', unselectItem);
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
        order.items.push({
            group: parent.prop('id'),
            item: button.find('h3').text(),
            price: button.data('price')
        });

        order.total += button.data('price');

        // Print total
        $('#selection .amount').text( toEuro( order.total.toFixed(2) ) );

        // Load new image_main
        $('#selection .image-stack').append('<img src="image_main/' +
                parent.prop('id') + "_" + button.find('h3').text().replace(/[ \/]/g, "_") +
                '.png" alt="VELOSIZER">');

        // Load preset if any
        if (preset !== null) {
            mergePreset(preset);
        }

        // Move on to next group
        if (nextGroup !== 'contact') {
            renderGroup(nextGroup);
        } else {
            renderContact();
        }

    }

    // One step back
    var unselectItem = function () {
        var previousGroup = $(this).data('parentgroup');
        $(this).parent().add('#' + previousGroup).remove();

        // clean up `order` object
        order.items.pop();
        order.total = 0;
        order.items.forEach( function (selected_item) {
            order.total += selected_item.price;
        });

        // restore `items` *** PROVISIONAL SOLUTION ***
        items = JSON.parse(JSON.stringify(items_original));

        // restore `#selection`
        $('#selection .amount').text( toEuro( order.total.toFixed(2) ) );
        $('#selection .image-stack img').last().remove();

        renderGroup(previousGroup);
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

    // Kontaktformular
    var renderContact = function() {
        var contact = '<div id="contact" class=""><h2>Kontaktdaten</h2>' +
                '<form name="contact"><table>' +
                '<tr><td>Vorname:</td><td><input type="text" name="prename" tabindex="1" /></td>' +
                '<td>Straße, Hausnr.:</td><td><input type="text" name="street" tabindex="5" /></td></tr>' +
                '<tr><td>Nachname:</td><td><input type="text" name="surname" tabindex="2" /></td>' +
                '<td>Postleitzahl:</td><td><input type="text" name="PLZ" tabindex="6" /></td></tr>' +
                '<tr><td>Firma:</td><td><input type="text" name="company" tabindex="3" /></td>' +
                '<td>Ort:</td><td><input type="text" name="city" tabindex="7" /></td></tr>' +
                '<tr><td>E-Mail:</td><td><input type="text" name="mail" tabindex="4" /></td>' +
                '<td>Telefon:</td><td><input type="text" name="phone" tabindex="8" /></td></tr>' +
                '</table>'+
                '<button>weiter</button></form>';
        $("#configurator").append( contact ).find('button').on('click', saveContact);
    }

    var saveContact = function(e) {
        e.preventDefault();
        var button = $(this);
        var caption = button.text() === 'bearbeiten' ? 'speichern' : 'bearbeiten';
        button.text(caption);
        button.off('click').on('click', saveContact);
        $('#contact input').each(function(){
            $(this).prop('disabled', caption === 'bearbeiten');
            order[ $(this).prop('name') ] = $(this).val();
        });
        if ( $('#confirmation').length === 1) {
            $('#confirmation button[type="submit"]').prop('disabled', caption !== 'bearbeiten');
        } else {
            renderConfirmation();
        }
    }

    // Bestellbestätigung
    var renderConfirmation = function() {
        var confirmation = '<div id="confirmation" class=""><h2>Bestellbestätigung</h2>' +
                '<form name="confirmation">' +
                '<input type="checkbox" name="agbs" /> Ich habe die <a href="#">AGBs</a> gelesen<br>' +
                '<input type="checkbox" name="widerruf" /> Ich habe die <a href="#">Widerrufbelehrung</a> gelesen<br>' +
                '<button type="submit">abschicken</button></form>';
        $("#configurator").append( confirmation ).find('button[type="submit"]').on('click', function(e) {
            e.preventDefault();
            order.agbs = $('input[name="agbs"]').prop('checked');
            order.widerruf = $('input[name="widerruf"]').prop('checked');
            console.log(JSON.stringify(order));
        });
    }

    var toEuro = function (amount) {
        var euro = amount.toString();
        euro = euro.indexOf('.') !== -1 ? euro.replace(/\.(\d*)/, ',$1') : euro + ',00';
        euro = euro.substr(-3,1) === ',' ? euro : euro + "0";
        euro = euro === "0,00" ? "inklusiv" : euro + " €";
        return euro;
    };

    exports.init = function (user_config) {
        config = user_config;

        // Load items
        if (items === undefined) {
            $.getJSON( user_config.items, function( item_data ) {

                items = item_data;
                // create deep copy of `items` for reset
                items_original = JSON.parse(JSON.stringify(items));

                // Load presets
                $.getJSON( user_config.presets, function( preset_data ) {

                    presets = preset_data;
                    renderGroup(user_config.firstGroup);

                }).fail(function() {
                    console.log( "ERROR: Failed to load \"" + user_config.presets + "\"" );
                });

            }).fail(function() {
                console.log( "ERROR: Failed to load \"" + user_config.items + "\"" );
            });
        } else {
            renderGroup(user_config.firstGroup);
        }
    };

    exports.reset = function (msg) {
        if (window.confirm(msg)) {
            items = JSON.parse(JSON.stringify(items_original));
            order = { items: [], total: 0 };
            $('#selection .amount, #configurator').html('');
            exports.init(config);
        }
    };

    //exports.order = order;

    return exports;

})(window, document, jQuery);
