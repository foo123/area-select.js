/**
*  area-select.js
*  A simple js class to select rectangular regions in DOM elements (image, canvas, video, etc..)
*  @VERSION: 1.1.0
*
*  https://github.com/foo123/area-select.js
*
**/
!function( root, name, factory ) {
"use strict";
var m;
if ( ('undefined'!==typeof Components)&&('object'===typeof Components.classes)&&('object'===typeof Components.classesByID)&&Components.utils&&('function'===typeof Components.utils['import']) ) /* XPCOM */
    (root.EXPORTED_SYMBOLS = [ name ]) && (root[ name ] = factory.call( root ));
else if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    module.exports = factory.call( root );
else if ( ('function'===typeof(define))&&define.amd&&('function'===typeof(require))&&('function'===typeof(require.specified))&&require.specified(name) ) /* AMD */
    define(name,['require','exports','module'],function( ){return factory.call( root );});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[ name ] = (m=factory.call( root )))&&('function'===typeof(define))&&define.amd&&define(function( ){return m;} );
}(  /* current root */          'undefined' !== typeof self ? self : this, 
    /* module name */           "AreaSelect",
    /* module factory */        function( undef ) {
"use strict";

var VERSION = "1.1.0", abs = Math.abs, round = Math.round,
    int = function( x ){ return parseInt(x||0,10)||0; },
    float = function( x ){ return parseFloat(x||0,10)||0; },
    trim_re = /^\s+|\s+$/g,
    trim = String.prototype.trim
        ? function( s ) { return s.trim(); }
        : function( s ){ return s.replace(trim_re,''); },
    NOP = 0, CREATE = 1, MOVE = 2, 
    RESIZE_E = 4, RESIZE_W = 8, RESIZE_N = 16, RESIZE_S = 32,
    RESIZE_X = RESIZE_E | RESIZE_W,
    RESIZE_Y = RESIZE_N | RESIZE_S,
    RESIZE = RESIZE_X | RESIZE_Y,
    computed_style = 'function' === typeof window.getComputedStyle
    ? function( el ){ return window.getComputedStyle(el, null); }
    : function( el ){ return el.currentStyle; },
    doc = window.document
;

function div( className ) 
{
    var d = document.createElement('div');
    //d.href = 'javascript:void(0)';
    if ( !!className ) d.className = className;
    return d;
}
function hasClass( el, className )
{
    return el.classList
        ? el.classList.contains(className)
        : -1 !== (' ' + el.className + ' ').indexOf(' ' + className + ' ')
    ;
}
function addClass( el, className )
{
    if ( !hasClass(el, className) )
    {
        if ( el.classList ) el.classList.add(className);
        else el.className = '' === el.className ? className : el.className + ' ' + className;
    }
}
function removeClass( el, className )
{
    if ( el.classList ) el.classList.remove(className);
    else el.className = trim((' ' + el.className + ' ').replace(' ' + className + ' ', ' '));
}
function addEvent( el, type, handler )
{
    if ( el.attachEvent ) el.attachEvent( 'on'+type, handler );
    else el.addEventListener( type, handler, false );
}
function removeEvent( el, type, handler )
{
    // if (el.removeEventListener) not working in IE11
    if ( el.detachEvent ) el.detachEvent( 'on'+type, handler );
    else el.removeEventListener( type, handler );
}
function triggerEvent( el, type )
{
    var ev;
    if ( document.createEvent )
    {
        ev = document.createEvent('HTMLEvents');
        ev.initEvent(type, true, false);
        el.dispatchEvent(ev);
    }
    else if ( document.createEventObject )
    {
        ev = document.createEventObject();
        el.fireEvent('on' + type, ev);
    }
}

// http://stackoverflow.com/questions/704564/disable-drag-and-drop-on-html-elements
// http://developer.nokia.com/Community/Wiki/How_to_disable_dragging_of_images_and_text_selection_in_web_pages
function disableDrag( el ) 
{
    // this works for FireFox and WebKit in future according to http://help.dottoro.com/lhqsqbtn.php
    el.__area_select_draggable = el.draggable || false;
    el.draggable = false;
    // this works for older web layout engines
    el.onmousedown = function( e ) {
        e = e || window.event;
        if ( e.preventDefault ) e.preventDefault();
        return false;
    };
}

function AreaSelect( el, options )
{
    var self = this;
    if ( !(self instanceof AreaSelect) ) return new AreaSelect(el, options);
    
    options = options || {};
    self.element( el );
    self.selection = null;
    
    var area = self.area = {x: 0, y: 0, w: 0, h: 0};
    area.main = div( !!options.className ? 'area-select area-select-marching-ants '+options.className : 'area-select area-select-marching-ants' );
    area.main.appendChild( area.__n = div( 'area-select-resize area-select-resize-n' ) );
    area.main.appendChild( area.__e = div( 'area-select-resize area-select-resize-e' ) );
    area.main.appendChild( area.__s = div( 'area-select-resize area-select-resize-s' ) );
    area.main.appendChild( area.__w = div( 'area-select-resize area-select-resize-w' ) );
    area.main.appendChild( area.__nw = div( 'area-select-resize area-select-resize-nw' ) );
    area.main.appendChild( area.__ne = div( 'area-select-resize area-select-resize-ne' ) );
    area.main.appendChild( area.__sw = div( 'area-select-resize area-select-resize-sw' ) );
    area.main.appendChild( area.__se = div( 'area-select-resize area-select-resize-se' ) );
    area.main.style.position = 'absolute';
    area.main.style.display = 'none';
    area.main.style.left = 0 + 'px';
    area.main.style.top = 0 + 'px';
    area.main.style.width = 0 + 'px';
    area.main.style.height = 0 + 'px';
    area.__n.__RESIZE = RESIZE_N; area.__n.__DIR = 'n';
    area.__s.__RESIZE = RESIZE_S; area.__s.__DIR = 's';
    area.__e.__RESIZE = RESIZE_E; area.__e.__DIR = 'e';
    area.__w.__RESIZE = RESIZE_W; area.__w.__DIR = 'w';
    area.__ne.__RESIZE = RESIZE_N | RESIZE_E; area.__ne.__DIR = 'ne';
    area.__nw.__RESIZE = RESIZE_N | RESIZE_W; area.__nw.__DIR = 'nw';
    area.__se.__RESIZE = RESIZE_S | RESIZE_E; area.__se.__DIR = 'se';
    area.__sw.__RESIZE = RESIZE_S | RESIZE_W; area.__sw.__DIR = 'sw';
    el.parentNode.appendChild( area.main );
    
    self.options = {
        minWidth: null != options.minWidth ? int(options.minWidth) : null,
        minHeight: null != options.minHeight ? int(options.minHeight) : null,
        maxWidth: null != options.maxWidth ? int(options.maxWidth) : null,
        maxHeight: null != options.maxHeight ? int(options.maxHeight) : null,
        ratioXY: null != options.ratioXY ? float(options.ratioXY) : null,
        ratioYX: null != options.ratioYX ? float(options.ratioYX) : null,
        withBorders: undef !== options.withBorders ? !!options.withBorders : false,
        onSelect: 'function' === typeof options.onSelect ? options.onSelect : null
    };
    
    var left = 0, top = 0, curLeft = 0, curTop = 0, action = NOP, cursor = '';
    
    var create = function( e, isTouch ){
        e = e || window.event;
        if ( self.el !== e.target ) return;
        if ( isTouch && e.preventDefault ) e.preventDefault();
        var o = self.options, el = self.el, area = self.area,
            rect = el.getBoundingClientRect( ),
            offset = {
                left: el.offsetLeft,
                top: el.offsetTop,
                width: el.offsetWidth,
                height: el.offsetHeight,
                scrollLeft: el.scrollLeft,
                scrollTop: el.scrollTop
            },
            style, borderLeftWidth = 0, borderTopWidth = 0
        ;
        
        if ( o.withBorders )
        {
            style = computed_style( el );
            borderLeftWidth = int(style['borderLeftWidth']);
            borderTopWidth = int(style['borderTopWidth']);
        }
        else
        {
            borderLeftWidth = 0;
            borderTopWidth = 0;
        }
        
        if ( isTouch )
        {
            // https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
            // https://developer.mozilla.org/en-US/docs/Web/API/Touch/clientX
            left = e.changedTouches[0].clientX - borderLeftWidth - rect.left;
            top = e.changedTouches[0].clientY - borderTopWidth - rect.top;
        }
        else
        {
            // http://www.jacklmoore.com/notes/mouse-position/
            left = e.clientX - borderLeftWidth - rect.left;
            top = e.clientY - borderTopWidth - rect.top;
        }
        
        if ( left < 0 ) left = 0;
        else if ( left >= offset.width ) left = offset.width-1;
        if ( top < 0 ) top = 0;
        else if ( top >= offset.height ) top = offset.height-1;
        
        action = CREATE;
        area.main.style.display = 'block';
        area.x = left; area.y = top; area.w = 0; area.h = 0;
        area.main.style.left = (offset.left-offset.scrollLeft + area.x) + 'px';
        area.main.style.top = (offset.top-offset.scrollTop + area.y) + 'px';
        area.main.style.width = 0 + 'px';
        area.main.style.height = 0 + 'px';
        area.main.style.cursor = 'se-resize';
        addClass(el, 'area-selecting');
        addClass(area.main, 'area-select-active');
        addClass(area.main, 'area-select-create');
        if ( isTouch )
        {
            addEvent(doc.body, 'touchcancel', onTouchCancel);
            addEvent(doc.body, 'touchmove', onTouchMove);
            addEvent(doc.body, 'touchend', onTouchEnd);
        }
        else
        {
            addEvent(doc.body, 'mousemove', onMouseMove);
            addEvent(doc.body, 'mouseup', onMouseUp);
        }
        //return;
    };
    
    var move = function( e, isTouch ){
        e = e || window.event;
        if ( self.area.main !== e.target ) return;
        if ( isTouch && e.preventDefault ) e.preventDefault();
        var o = self.options, el = self.el, area = self.area,
            rect = el.getBoundingClientRect( ),
            offset = {
                /*left: el.offsetLeft,
                top: el.offsetTop,*/
                width: el.offsetWidth,
                height: el.offsetHeight//,
                /*scrollLeft: el.scrollLeft,
                scrollTop: el.scrollTop*/
            },
            style, borderLeftWidth = 0, borderTopWidth = 0
        ;

        if ( o.withBorders )
        {
            style = computed_style( el );
            borderLeftWidth = int(style['borderLeftWidth']);
            borderTopWidth = int(style['borderTopWidth']);
        }
        else
        {
            borderLeftWidth = 0;
            borderTopWidth = 0;
        }
        
        if ( isTouch )
        {
            left = e.changedTouches[0].clientX - borderLeftWidth - rect.left;
            top = e.changedTouches[0].clientY - borderTopWidth - rect.top;
        }
        else
        {
            left = e.clientX - borderLeftWidth - rect.left;
            top = e.clientY - borderTopWidth - rect.top;
        }
        
        if ( left < 0 ) left = 0;
        else if ( left >= offset.width ) left = offset.width-1;
        if ( top < 0 ) top = 0;
        else if ( top >= offset.height ) top = offset.height-1;

        action = MOVE;
        area.main.style.cursor = 'move';
        addClass(el, 'area-selecting');
        addClass(area.main, 'area-select-active');
        addClass(area.main, 'area-select-move');
        if ( isTouch )
        {
            addEvent(doc.body, 'touchcancel', onTouchCancel);
            addEvent(doc.body, 'touchmove', onTouchMove);
            addEvent(doc.body, 'touchend', onTouchEnd);
        }
        else
        {
            addEvent(doc.body, 'mousemove', onMouseMove);
            addEvent(doc.body, 'mouseup', onMouseUp);
        }
        //return;
    };
    
    var resize = function( e, isTouch ){
        e = e || window.event;
        var target = e.target, area = self.area;
        if ( area.__n !== target && 
            area.__s !== target && 
            area.__e !== target && 
            area.__w !== target && 
            area.__ne !== target && 
            area.__nw !== target && 
            area.__se !== target && 
            area.__sw !== target
        ) return;
        if ( isTouch && e.preventDefault ) e.preventDefault();
        var o = self.options, el = self.el, 
            rect = el.getBoundingClientRect( ),
            offset = {
                /*left: el.offsetLeft,
                top: el.offsetTop,*/
                width: el.offsetWidth,
                height: el.offsetHeight//,
                /*scrollLeft: el.scrollLeft,
                scrollTop: el.scrollTop*/
            },
            style, borderLeftWidth = 0, borderTopWidth = 0
        ;

        if ( o.withBorders )
        {
            style = computed_style( el );
            borderLeftWidth = int(style['borderLeftWidth']);
            borderTopWidth = int(style['borderTopWidth']);
        }
        else
        {
            borderLeftWidth = 0;
            borderTopWidth = 0;
        }
        
        if ( isTouch )
        {
            left = e.changedTouches[0].clientX - borderLeftWidth - rect.left;
            top = e.changedTouches[0].clientY - borderTopWidth - rect.top;
        }
        else
        {
            left = e.clientX - borderLeftWidth - rect.left;
            top = e.clientY - borderTopWidth - rect.top;
        }
        
        if ( left < 0 ) left = 0;
        else if ( left >= offset.width ) left = offset.width-1;
        if ( top < 0 ) top = 0;
        else if ( top >= offset.height ) top = offset.height-1;

        action = target.__RESIZE || 0;
        area.x0 = area.x; area.y0 = area.y;
        area.x1 = area.x+area.w; area.y1 = area.y+area.h;
        area.main.style.cursor = (target.__DIR||'se')+'-resize';
        addClass(el, 'area-selecting');
        addClass(area.main, 'area-select-active');
        addClass(area.main, 'area-select-resize');
        if ( isTouch )
        {
            addEvent(doc.body, 'touchcancel', onTouchCancel);
            addEvent(doc.body, 'touchmove', onTouchMove);
            addEvent(doc.body, 'touchend', onTouchEnd);
        }
        else
        {
            addEvent(doc.body, 'mousemove', onMouseMove);
            addEvent(doc.body, 'mouseup', onMouseUp);
        }
        //return;
    };
    
    var onMouseMove = function(e){onMove(e, false);};
    var onMouseUp = function(e){onEnd(e, false);};
    var onTouchMove = function(e){onMove(e, true);};
    var onTouchEnd = function(e){onEnd(e, true);};
    var onTouchCancel = function( e ) {
        e = e || window.event;
        if ( e.preventDefault ) e.preventDefault();
        removeEvent(doc.body, 'touchcancel', onTouchCancel);
        removeEvent(doc.body, 'touchmove', onTouchMove);
        removeEvent(doc.body, 'touchend', onTouchEnd);
        left = top = curLeft = curTop = 0;
        if ( CREATE & action ) removeClass(area.main, 'area-select-create');
        else if ( MOVE & action ) removeClass(area.main, 'area-select-move');
        else if ( RESIZE & action ) removeClass(area.main, 'area-select-resize');
        removeClass(area.main, 'area-select-active');
        removeClass(el, 'area-selecting');
        area.main.style.cursor = '';
        action = NOP;
    };
    var onMove = function( e, isTouch ){
        e = e || window.event;
        if ( isTouch && e.preventDefault ) e.preventDefault();
        var o = self.options, el = self.el, area = self.area,
            rect = el.getBoundingClientRect( ),
            offset = {
                left: el.offsetLeft,
                top: el.offsetTop,
                width: el.offsetWidth,
                height: el.offsetHeight,
                scrollLeft: el.scrollLeft,
                scrollTop: el.scrollTop
            },
            style, borderLeftWidth = 0, borderTopWidth = 0,
            cursorX = 'e', cursorY = 's', x, y
        ;

        if ( o.withBorders )
        {
            style = computed_style( el );
            borderLeftWidth = int(style['borderLeftWidth']);
            borderTopWidth = int(style['borderTopWidth']);
        }
        else
        {
            borderLeftWidth = 0;
            borderTopWidth = 0;
        }
        
        if ( isTouch )
        {
            curLeft = e.changedTouches[0].clientX - borderLeftWidth - rect.left;
            curTop = e.changedTouches[0].clientY - borderTopWidth - rect.top;
        }
        else
        {
            curLeft = e.clientX - borderLeftWidth - rect.left;
            curTop = e.clientY - borderTopWidth - rect.top;
        }
        
        if ( curLeft < 0 ) curLeft = 0;
        else if ( curLeft >= offset.width ) curLeft = offset.width-1;
        if ( curTop < 0 ) curTop = 0;
        else if ( curTop >= offset.height ) curTop = offset.height-1;
        
        if ( CREATE & action )
        {
            x = area.w; y = area.h;
            if ( curLeft < left )
            {
                area.x = curLeft;
                area.w = left - curLeft;
                cursorX = 'w';
            }
            else
            {
                area.x = left;
                area.w = curLeft - left;
            }
            
            if ( curTop < top )
            {
                area.y = curTop;
                area.h = top - curTop;
                cursorY = 'n';
            }
            else
            {
                area.y = top;
                area.h = curTop - top;
            }
            
            if ( o.ratioYX ) area.h = round(area.w*o.ratioYX);
            else if ( o.ratioXY ) area.w = round(area.h*o.ratioXY);
            
            if ( null != o.minWidth && area.w < o.minWidth ) area.w = o.minWidth;
            if ( null != o.minHeight && area.h < o.minHeight ) area.h = o.minHeight;
            if ( null != o.maxWidth && area.w > o.maxWidth ) area.w = o.maxWidth;
            if ( null != o.maxHeight && area.h > o.maxHeight ) area.h = o.maxHeight;

            if ( area.x+area.w > offset.width ) area.w = offset.width-area.x-1;
            if ( area.y+area.h > offset.height ) area.h = offset.height-area.y-1;
            
            area.main.style.left = (offset.left-offset.scrollLeft + area.x) + 'px';
            area.main.style.top = (offset.top-offset.scrollTop + area.y) + 'px';
            area.main.style.width = area.w + 'px'; area.main.style.height = area.h + 'px';
            if ( 2 > abs(x - area.w) )  cursorX = '';
            if ( 2 > abs(y - area.h) )  cursorY = '';
            if ( !cursorX && !cursorY ) cursorX = 'se';
            area.main.style.cursor = cursorY+cursorX+'-resize';
        }
        else if ( MOVE & action )
        {
            if ( area.main !== e.target ) return;
            area.x += curLeft-left; area.y += curTop-top;
            left = curLeft; top = curTop;
            if ( area.x+area.w >= offset.width ) area.x = offset.width-area.w-1;
            else if ( area.x < 0 ) area.x = 0;
            if ( area.y+area.h >= offset.height ) area.y = offset.height-area.h-1;
            else if ( area.y < 0 ) area.y = 0;
            area.main.style.left = (offset.left-offset.scrollLeft + area.x) + 'px';
            area.main.style.top = (offset.top-offset.scrollTop + area.y) + 'px';
            area.main.style.cursor = 'move';
        }
        else if ( RESIZE & action )
        {
            if ( RESIZE_E & action )
            {
                if ( curLeft < area.x0 )
                {
                    area.x = curLeft;
                    area.w = area.x0-curLeft;
                }
                else
                {
                    area.x = area.x0;
                    area.w = curLeft-area.x0;
                }
            }
            if ( RESIZE_W & action )
            {
                if ( curLeft > area.x1 )
                {
                    area.x = area.x1;
                    area.w = curLeft-area.x1;
                }
                else
                {
                    area.x = curLeft;
                    area.w = area.x1-curLeft;
                }
            }
            if ( RESIZE_S & action)
            {
                if ( curTop < area.y0 )
                {
                    area.y = curTop;
                    area.h = area.y0-curTop;
                }
                else
                {
                    area.y = area.y0;
                    area.h = curTop-area.y0;
                }
            }
            if ( RESIZE_N & action)
            {
                if ( curTop > area.y1 )
                {
                    area.y = area.y1;
                    area.h = curTop-area.y1;
                }
                else
                {
                    area.y = curTop;
                    area.h = area.y1-curTop;
                }
            }
            
            if ( o.ratioYX )
            {
                if ( !(RESIZE_X & action) )
                    area.w = round(area.h/o.ratioYX);
                else
                    area.h = round(area.w*o.ratioYX);
            }
            else if ( o.ratioXY )
            {
                if ( !(RESIZE_Y & action) )
                    area.h = round(area.w/o.ratioXY);
                else
                    area.w = round(area.h*o.ratioXY);
            }
            
            if ( null != o.minWidth && area.w < o.minWidth ) area.w = o.minWidth;
            if ( null != o.maxWidth && area.w > o.maxWidth ) area.w = o.maxWidth;
            if ( null != o.minHeight && area.h < o.minHeight ) area.h = o.minHeight;
            if ( null != o.maxHeight && area.h > o.maxHeight ) area.h = o.maxHeight;
            if ( area.x+area.w > offset.width ) area.w = offset.width-area.x-1;
            if ( area.y+area.h > offset.height ) area.h = offset.height-area.y-1;
            
            area.main.style.left = (offset.left-offset.scrollLeft + area.x) + 'px';
            area.main.style.top = (offset.top-offset.scrollTop + area.y) + 'px';
            area.main.style.width = area.w + 'px';
            area.main.style.height = area.h + 'px';
            area.main.style.cursor = e.target.__DIR+'-resize';
        }
        //return;
    };
    
    var onEnd = function( e, isTouch ){
        var el = self.el, area = self.area, o = self.options;
        
        e = e || window.event;
        if ( isTouch && e.preventDefault ) e.preventDefault();
        
        self.selection = {
            x1: round(area.x),
            y1: round(area.y),
            x2: round(area.x+area.w),
            y2: round(area.y+area.h)
        };
        left = top = curLeft = curTop = 0;
        
        if ( isTouch )
        {
            removeEvent(doc.body, 'touchcancel', onTouchCancel);
            removeEvent(doc.body, 'touchmove', onTouchMove);
            removeEvent(doc.body, 'touchend', onTouchEnd);
        }
        else
        {
            removeEvent(doc.body, 'mousemove', onMouseMove);
            removeEvent(doc.body, 'mouseup', onMouseUp);
        }
        
        if ( CREATE & action ) removeClass(area.main, 'area-select-create');
        else if ( MOVE & action ) removeClass(area.main, 'area-select-move');
        else if ( RESIZE & action ) removeClass(area.main, 'area-select-resize');
        removeClass(area.main, 'area-select-active');
        removeClass(el, 'area-selecting');
        area.main.style.cursor = '';
        
        action = NOP;
        
        if ( o.onSelect )
        {
            setTimeout(function( ){
                o.onSelect.call( self, self.el, self.getSelection() );
            }, 10);
        }
        //return;
    };
    el.__area_select_evt = [function(e){create(e, false);}, function(e){create(e, true);}];
    addEvent(el, 'mousedown', el.__area_select_evt[0]);
    addEvent(el, 'touchstart', el.__area_select_evt[1]);
    addEvent(area.__n, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__s, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__e, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__w, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__ne, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__nw, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__se, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__sw, 'mousedown', function(e){resize(e, false);});
    addEvent(area.__n, 'touchstart', function(e){resize(e, true);});
    addEvent(area.__s, 'touchstart', function(e){resize(e, true);});
    addEvent(area.__e, 'touchstart', function(e){resize(e, true);});
    addEvent(area.__w, 'touchstart', function(e){resize(e, true);});
    addEvent(area.__ne, 'touchstart', function(e){resize(e, true);});
    addEvent(area.__nw, 'touchstart', function(e){resize(e, true);});
    addEvent(area.__se, 'touchstart', function(e){resize(e, true);});
    addEvent(area.__sw, 'touchstart', function(e){resize(e, true);});
    addEvent(area.main, 'mousedown', function(e){move(e, false);});
    addEvent(area.main, 'touchstart', function(e){move(e, true);});
};
AreaSelect.VERSION = VERSION;

AreaSelect.prototype = {
    
    constructor : AreaSelect,
    
    el: null,
    area: null,
    selection: null,
    options: null,
    
    dispose: function( ) {
        var self = this, el = self.el, area = self.area;
        self.deselect( );
        if ( el )
        {
            if ( el.__area_select_evt )
            {
                removeEvent(el, 'mousedown', el.__area_select_evt[0]);
                removeEvent(el, 'touchstart', el.__area_select_evt[1]);
                el.__area_select_evt = null;
            }
            if ( area && area.main ) el.parentNode.removeChild( area.main );
            e.draggable = el.__area_select_draggable;
            el.__area_select_draggable = null;
            removeClass(el, 'area-selectable');
        }
        self.el = null;
        self.area = null;
        self.selection = null;
        self.options = null;
        return self;
    },
    
    element: function( el ) {
        disableDrag( this.el = el );
        addClass(this.el, 'area-selectable');
        return this;
    },
    
    reset: function( ) {
        var self = this;
        self.selection = null;
        self.options = {};
        return self;
    },
    
    show: function( ) {
        this.area.main.style.display = 'block';
        this.area.main.style.cursor = '';
        return this;
    },
    
    hide: function( ) {
        this.area.main.style.display = 'none';
        this.area.main.style.cursor = '';
        return this;
    },
    
    select: function( selection ) {
        var self = this, el = self.el, area = self.area;
        if ( 'object' === typeof selection )
        {
            area.x = selection.x1;
            area.y = selection.y1;
            area.w = selection.x2-selection.x1;
            area.h = selection.y2-selection.y1;
            area.main.style.left = (el.offsetLeft-el.scrollLeft + area.x) + 'px';
            area.main.style.top = (el.offsetTop-el.scrollTop + area.y) + 'px';
            area.main.style.width = area.w + 'px';
            area.main.style.height = area.h + 'px';
            self.selection = {
                x1: round(area.x),
                y1: round(area.y),
                x2: round(area.x+area.w),
                y2: round(area.y+area.h)
            };
        }
        else if ( false === selection )
        {
            self.selection = null;
        }
        return self;
    },
    
    deselect: function( ) {
        this.selection = null;
        return this.hide();
    },
    
    getSelection: function( ) {
        var sel = this.selection;
        return sel ? {
            x1: sel.x1, 
            y1: sel.y1,
            x2: sel.x2, 
            y2: sel.y2, 
            width: abs(sel.x2-sel.x1), 
            height: abs(sel.y2-sel.y1)
        } : null;
    }
};

// export it
return AreaSelect;
});