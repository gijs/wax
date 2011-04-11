// namespacing!
if (!com) {
    var com = { };
    if (!com.modestmaps) {
        com.modestmaps = { };
    }
}

// A chaining-style control that adds
// interaction to a modestmaps.Map object.
//
// Takes an options object with the following keys:
//
// * `callbacks` (optional): an `out`, `over`, and `click` callback.
//   If not given, the `wax.tooltip` library will be expected.
com.modestmaps.Map.prototype.interaction = function(options) {
    options = options || {};
    // Our GridManager (from `gridutil.js`). This will keep the
    // cache of grid information and provide friendly utility methods
    // that return `GridTile` objects instead of raw data.
    this.waxGM = new wax.GridManager();

    // This requires wax.Tooltip or similar
    this.callbacks = options.callbacks || {
        out: wax.tooltip.unselect,
        over: wax.tooltip.select,
        click: wax.tooltip.click
    };

    // Search through `.tiles` and determine the position,
    // from the top-left of the **document**, and cache that data
    // so that `mousemove` events don't always recalculate.
    this.waxGetTileGrid = function() {
        // TODO: don't build for tiles outside of viewport
        var zoom = this.getZoom();
        // Calculate a tile grid and cache it, by using the `.tiles`
        // element on this map.
        return this._waxGetTileGrid || (this._waxGetTileGrid =
            (function(t) {
                var o = [];
                $.each(t, function(key, img) {
                    if (key.split(',')[0] == zoom) {
                        var $img = $(img);
                        var offset = $img.offset();
                        o.push([offset.top, offset.left, $img]);
                    }
                });
                return o;
            })(this.tiles));
    };

    // On `mousemove` events that **don't** have the mouse button
    // down - so that the map isn't being dragged.
    $(this.parent).nondrag($.proxy(function(evt) {
        var grid = this.waxGetTileGrid();
        for (var i = 0; i < grid.length; i++) {
            if ((grid[i][0] < evt.pageY) &&
               ((grid[i][0] + 256) > evt.pageY) &&
                (grid[i][1] < evt.pageX) &&
               ((grid[i][1] + 256) > evt.pageX)) {
                var $tile = grid[i][2];
                break;
            }
        }

        if ($tile) {
            this.waxGM.getGrid($tile.attr('src'), $.proxy(function(g) {
                if (g) {
                    var feature = g.getFeature(evt.pageX, evt.pageY, $tile, {
                        format: 'teaser'
                    });
                    // This and other Modest Maps controls only support a single layer.
                    // Thus a layer index of **0** is given to the tooltip library
                    if (feature) {
                        if (feature && this.feature !== feature) {
                            this.feature = feature;
                            this.callbacks.out(feature, this.parent, 0, evt);
                            this.callbacks.over(feature, this.parent, 0, evt);
                        } else if (!feature) {
                            this.feature = null;
                            this.callbacks.out(feature, this.parent, 0, evt);
                        }
                    } else {
                        this.feature = null;
                        this.callbacks.out({}, this.parent, 0, evt);
                    }
                }
            }, this));
        }

    }, this));

    // When the map is moved, the calculated tile grid is no longer
    // accurate, so it must be reset.
    var modifying_events = ['zoomed', 'panned', 'centered',
        'extentset', 'resized', 'drawn'];
    for (var i = 0; i < modifying_events.length; i++) {
        this.addCallback(modifying_events[i], function(map, e) {
            map._waxGetTileGrid = null;
        });
    }

    // Ensure chainability
    return this;
};