/**
*  area-select.js
*  A simple js class to select rectabgular regions in DOM elements (image, canvas, video, etc..)
*
*  https://github.com/foo123/area-select.js
*
*  @author: Nikos M.  http://nikos-web-development.netai.net/
*
**/
(function(window, undef) {

    var abs = Math.abs, round = Math.round, delay = 100
    ;

    function div(className) 
    {
        var d = document.createElement('div');
        if (className) d.className = className;
        return d;
    }
    
    function addEvent(el, event, handler)
    {
        // DOM standard
        if ( el.addEventListener ) 
            el.addEventListener(event, handler, false);
        // IE
        else if ( el.attachEvent ) 
            el.attachEvent('on'+event, handler);
    }
    
    function removeEvent(el, event, handler) 
    {
        // DOM standard
        if ( el.removeEventListener ) 
            el.removeEventListener(event, handler, false);
        // IE
        else if ( el.detachEvent )
            el.detachEvent ('on'+event, handler); 
    }
    
    // http://stackoverflow.com/questions/704564/disable-drag-and-drop-on-html-elements
    // http://developer.nokia.com/Community/Wiki/How_to_disable_dragging_of_images_and_text_selection_in_web_pages
    function disableDrag(el) 
    {
        // this works for FireFox and WebKit in future according to http://help.dottoro.com/lhqsqbtn.php
        el.draggable = false;
        // this works for older web layout engines
        el.onmousedown = function(e) {
            e.preventDefault();
            return false;
        };
    }
    
    var AreaSelect = function(el, options) {
        
        options = options || {};
        
        var self = this;
        
        this.element( el );
        
        this.selection = null;
        
        var area = this.area = div( options.className || 'img-area-select' );
        area.style.position = 'absolute';
        area.style.display = 'none';
        area.style.zIndex = options.zIndex || 100;
        area.style.left = 0 + 'px';
        area.style.top = 0 + 'px';
        area.style.width = 0 + 'px';
        area.style.height = 0 + 'px';
        el.parentNode.appendChild( area );
        
        var w = 0, h = 0, left = 0, top = 0, curLeft = 0, curTop = 0, cursor,
            withBorders = (undef !== options.withBorders ) ? options.withBorders : false
        ;
        
        var onElMouseDown = function(e) {
            
            e = e || window.event;
            
            // http://www.jacklmoore.com/notes/mouse-position/
            var el = self._el, style = el.currentStyle || window.getComputedStyle(el, null),
                borderLeftWidth = (withBorders) ? parseInt(style['borderLeftWidth'], 10) : 0,
                borderTopWidth = (withBorders) ? parseInt(style['borderTopWidth'], 10) : 0,
                rect = el.getBoundingClientRect()
            ;

            left = e.clientX - borderLeftWidth - rect.left;
            top = e.clientY - borderTopWidth - rect.top;
            
            if (left < 0) left = 0;
            else if (left >= el.offsetWidth) left = el.offsetWidth-1;
            if (top < 0) top = 0;
            else if (top >= el.offsetHeight) top = el.offsetHeight-1;
            
            w = 0;
            h = 0;
            
            cursor = el.style.cursor;
            el.style.cursor = area.style.cursor = 'se-resize';
            
            area.style.display = 'block';
            
            area.style.left = (el.offsetLeft - el.scrollLeft + left) + 'px';
            area.style.top = (el.offsetTop - el.scrollTop + top) + 'px';
            area.style.width = w + 'px';
            area.style.height = h + 'px';
            
            addEvent(el, 'mousemove', onElMouseMove);
            addEvent(el, 'mouseup', onElMouseUp);
            addEvent(area, 'mousemove', onElMouseMove);
            addEvent(area, 'mouseup', onElMouseUp);
            
            return false;
        };
        
        var onElMouseMove = function(e) {
            
            e = e || window.event;
            
            // http://www.jacklmoore.com/notes/mouse-position/
            var el = self._el, style = el.currentStyle || window.getComputedStyle(el, null),
                borderLeftWidth = (withBorders) ? parseInt(style['borderLeftWidth'], 10) : 0,
                borderTopWidth = (withBorders) ? parseInt(style['borderTopWidth'], 10) : 0,
                rect = el.getBoundingClientRect()
            ;

            var cursorX = 'e', cursorY = 's', x, y;

            curLeft = e.clientX - borderLeftWidth - rect.left;
            curTop = e.clientY - borderTopWidth - rect.top;
            
            if (curLeft < 0) curLeft = 0;
            else if (curLeft >= el.offsetWidth) curLeft = el.offsetWidth-1;
            if (curTop < 0) curTop = 0;
            else if (curTop >= el.offsetHeight) curTop = el.offsetHeight-1;
            
            if ( curLeft < left )
            {
                x = curLeft;
                area.style.left = (el.offsetLeft - el.scrollLeft + curLeft) + 'px';
                w = left - curLeft;
                cursorX = 'w';
            }
            else
            {
                if ( curLeft == left )  cursorX = '';
                x = left;
                area.style.left = (el.offsetLeft - el.scrollLeft + left) + 'px';
                w = curLeft - left;
            }
            
            if ( curTop < top )
            {
                y = curTop;
                area.style.top = (el.offsetTop - el.scrollTop + curTop) + 'px';
                h = top - curTop;
                cursorY = 'n';
            }
            else
            {
                if ( curTop == top )  cursorY = '';
                y = top;
                area.style.top = (el.offsetTop - el.scrollTop + top) + 'px';
                h = curTop - top;
            }
            
            if ( x+w > el.offsetWidth ) w = el.offsetWidth-x-1;
            if ( y+h > el.offsetHeight ) h = el.offsetHeight-y-1;
            
            area.style.width = w + 'px';
            area.style.height = h + 'px';
            el.style.cursor = area.style.cursor = cursorY+cursorX+'-resize';
            
            return false;
        };
        
        var onElMouseUp = function(e) {
            
            e = e || window.event;
            
            self.selection = {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0
            };
            
            if (curLeft < left)
            {
                self.selection.x1 = round(curLeft);
                self.selection.x2 = round(left);
            }
            else
            {
                self.selection.x1 = round(left);
                self.selection.x2 = round(curLeft);
            }
            if (curTop < top)
            {
                self.selection.y1 = round(curTop);
                self.selection.y2 = round(top);
            }
            else
            {
                self.selection.y1 = round(top);
                self.selection.y2 = round(curTop);
            }
            left = top = curLeft = curTop = w = h = 0;
            
            var el = self._el;
            el.style.cursor = cursor;
            area.style.cursor = 'auto';
            
            removeEvent(el, 'mousemove', onElMouseMove);
            removeEvent(el, 'mouseup', onElMouseUp);
            removeEvent(area, 'mousemove', onElMouseMove);
            removeEvent(area, 'mouseup', onElMouseUp);
            
            if ( self.callback )
            {
                setTimeout(function(){ self.callback.call( self, self.getSelection() ); }, delay);
            }
            
            return false;
        };
        
        if ( options.onSelection ) this.onSelection( options.onSelection );
        
        addEvent(el, 'mousedown', onElMouseDown);
        addEvent(area, 'mousedown', onElMouseDown);
    };
    
    AreaSelect.prototype = {
        
        constructor : AreaSelect,
        
        _el: null,
        area: null,
        selection: null,
        callback: null,
        
        element: function(el) {
            disableDrag( el );
            this._el = el;
            return this;
        },
        
        reset: function() {
            this._el = null;
            this.area = null;
            this.selection = null;
            this.callback = null;
            return this;
        },
        
        show: function() {
            this.area.style.display = 'block';
            return this;
        },
        
        hide: function() {
            this.area.style.display = 'none';
            return this;
        },
        
        deselect: function() {
            this.selection = null;
            return this.hide();
        },
        
        getSelection: function() {
            var sel = this.selection;
            return (sel) ? {
                x1: sel.x1, 
                y1: sel.y1,
                x2: sel.x2, 
                y2: sel.y2, 
                width: abs(sel.x2-sel.x1), 
                height: abs(sel.y2-sel.y1)
            } : null;
        },
        
        onSelection: function(callback) {
            this.callback = callback;
            return this;
        },
        
        dispose: function() {
            this.deselect();
            this._el.parentNode.removeChild( this.area );
            return this.reset();
        }
    };
    
    // export it
    window.AreaSelect = AreaSelect;
    
})(window);