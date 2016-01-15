/**
*  area-select.js
*  A simple js class to select rectabgular regions in DOM elements (image, canvas, video, etc..)
*  @VERSION: 0.5.0
*
*  https://github.com/foo123/area-select.js
*  @author: Nikos M.  http://nikos-web-development.netai.net/
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
}(  /* current root */          this, 
    /* module name */           "AreaSelect",
    /* module factory */        function( undef ) {
"use strict";

var VERSION = "0.5.0", abs = Math.abs, round = Math.round,
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
    else el.addEventListener( type, handler );
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
    area.main = div( !!options.className ? 'area-select marching-ants '+options.className : 'area-select marching-ants' );
    area.main.appendChild( area.n = div( 'area-select-resize area-select-resize-n' ) );
    area.main.appendChild( area.e = div( 'area-select-resize area-select-resize-e' ) );
    area.main.appendChild( area.s = div( 'area-select-resize area-select-resize-s' ) );
    area.main.appendChild( area.w = div( 'area-select-resize area-select-resize-w' ) );
    area.main.appendChild( area.nw = div( 'area-select-resize area-select-resize-nw' ) );
    area.main.appendChild( area.ne = div( 'area-select-resize area-select-resize-ne' ) );
    area.main.appendChild( area.sw = div( 'area-select-resize area-select-resize-sw' ) );
    area.main.appendChild( area.se = div( 'area-select-resize area-select-resize-se' ) );
    area.main.style.position = 'absolute';
    area.main.style.display = 'none';
    area.main.style.left = 0 + 'px';
    area.main.style.top = 0 + 'px';
    area.main.style.width = 0 + 'px';
    area.main.style.height = 0 + 'px';
    area.n.__RESIZE = RESIZE_N;
    area.s.__RESIZE = RESIZE_S;
    area.n__DIR = 'n';
    area.s.__DIR = 's';
    area.e.__RESIZE = RESIZE_E;
    area.w.__RESIZE = RESIZE_W;
    area.e__DIR = 'e';
    area.w.__DIR = 'w';
    area.ne.__RESIZE = RESIZE_N | RESIZE_E;
    area.nw.__RESIZE = RESIZE_N | RESIZE_W;
    area.se.__RESIZE = RESIZE_S | RESIZE_E;
    area.sw.__RESIZE = RESIZE_S | RESIZE_W;
    area.ne__DIR = 'ne'; area.nw.__DIR = 'nw';
    area.se__DIR = 'se'; area.sw.__DIR = 'sw';
    el.parentNode.appendChild( area.main );
    
    self.options = {
        minWidth: null != options.minWidth ? int(options.minWidth) : null,
        minHeight: null != options.minHeight ? int(options.minHeight) : null,
        maxWidth: null != options.maxWidth ? int(options.maxWidth) : null,
        maxHeight: null != options.maxHeight ? int(options.maxHeight) : null,
        ratioX: null != options.ratioX ? float(options.ratioX) : null,
        ratioY: null != options.ratioY ? float(options.ratioY) : null,
        withBorders: undef !== options.withBorders ? !!options.withBorders : false,
        onSelect: 'function' === typeof options.onSelect ? options.onSelect : null
    };
    
    var left = 0, top = 0, curLeft = 0, curTop = 0, action = NOP, cursor = '';
    
    var create = function( e ){
        e = e || window.event;
        if ( self.el !== e.target ) return;
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
            style = computed_style( el ),
            borderLeftWidth = o.withBorders ? int(style['borderLeftWidth']) : 0,
            borderTopWidth = o.withBorders ? int(style['borderTopWidth']) : 0
        ;

        // http://www.jacklmoore.com/notes/mouse-position/
        left = e.clientX - borderLeftWidth - rect.left;
        top = e.clientY - borderTopWidth - rect.top;
        
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
        addEvent(doc.body, 'mousemove', onMouseMove);
        addEvent(doc.body, 'mouseup', onMouseUp);
        return;
    };
    
    var move = function( e ){
        e = e || window.event;
        if ( self.area.main !== e.target ) return;
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
            style = computed_style( el ),
            borderLeftWidth = o.withBorders ? int(style['borderLeftWidth']) : 0,
            borderTopWidth = o.withBorders ? int(style['borderTopWidth']) : 0
        ;

        left = e.clientX - borderLeftWidth - rect.left;
        top = e.clientY - borderTopWidth - rect.top;
        
        if ( left < 0 ) left = 0;
        else if ( left >= offset.width ) left = offset.width-1;
        if ( top < 0 ) top = 0;
        else if ( top >= offset.height ) top = offset.height-1;

        action = MOVE;
        area.main.style.cursor = 'move';
        addClass(el, 'area-selecting');
        addEvent(doc.body, 'mousemove', onMouseMove);
        addEvent(doc.body, 'mouseup', onMouseUp);
        return;
    };
    
    var resize = function( e ){
        e = e || window.event;
        var target = e.target, area = self.area;
        if ( area.n !== target && 
            area.s !== target && 
            area.e !== target && 
            area.w !== target && 
            area.ne !== target && 
            area.nw !== target && 
            area.se !== target && 
            area.sw !== target
        ) return;
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
            style = computed_style( el ),
            borderLeftWidth = o.withBorders ? int(style['borderLeftWidth']) : 0,
            borderTopWidth = o.withBorders ? int(style['borderTopWidth']) : 0
        ;

        left = e.clientX - borderLeftWidth - rect.left;
        top = e.clientY - borderTopWidth - rect.top;
        
        if ( left < 0 ) left = 0;
        else if ( left >= offset.width ) left = offset.width-1;
        if ( top < 0 ) top = 0;
        else if ( top >= offset.height ) top = offset.height-1;

        action = target.__RESIZE || 0;
        area.x0 = area.x; area.y0 = area.y;
        area.x1 = area.x+area.w; area.y1 = area.y+area.h;
        area.main.style.cursor = 'se-resize';
        addClass(el, 'area-selecting');
        addEvent(doc.body, 'mousemove', onMouseMove);
        addEvent(doc.body, 'mouseup', onMouseUp);
        return;
    };
    
    var onMouseMove = function( e ){
        e = e || window.event;
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
            style = computed_style( el ),
            borderLeftWidth = o.withBorders ? int(style['borderLeftWidth']) : 0,
            borderTopWidth = o.withBorders ? int(style['borderTopWidth']) : 0,
            cursorX = 'e', cursorY = 's', x, y
        ;

        curLeft = e.clientX - borderLeftWidth - rect.left;
        curTop = e.clientY - borderTopWidth - rect.top;
        
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
            if ( RESIZE_X & action )
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
                else /*if ( RESIZE_W & action )*/
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
                if ( area.w < 0 ) area.w = -area.w;
                if ( null != o.minWidth && area.w < o.minWidth ) area.w = o.minWidth;
                if ( null != o.maxWidth && area.w > o.maxWidth ) area.w = o.maxWidth;
                if ( area.x+area.w > offset.width ) area.w = offset.width-area.x-1;
                area.main.style.left = (offset.left-offset.scrollLeft + area.x) + 'px';
                area.main.style.width = area.w + 'px';
            }
            
            if ( RESIZE_Y & action )
            {
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
                else /*if ( RESIZE_N & action)*/
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
                if ( area.h < 0 ) area.h = -area.h;
                if ( null != o.minHeight && area.h < o.minHeight ) area.h = o.minHeight;
                if ( null != o.maxHeight && area.h > o.maxHeight ) area.h = o.maxHeight;
                if ( area.y+area.h > offset.height ) area.h = offset.height-area.y-1;
                area.main.style.top = (offset.top-offset.scrollTop + area.y) + 'px';
                area.main.style.height = area.h + 'px';
            }
            area.main.style.cursor = e.target.__DIR+'-resize';
        }
        return;
    };
    
    var onMouseUp = function( e ){
        var el = self.el, area = self.area, o = self.options;
        
        e = e || window.event;
        
        self.selection = {
            x1: round(area.x),
            y1: round(area.y),
            x2: round(area.x+area.w),
            y2: round(area.y+area.h)
        };
        left = top = curLeft = curTop = 0;
        
        removeClass(el, 'area-selecting');
        area.main.style.cursor = '';
        action = NOP;
        removeEvent(doc.body, 'mousemove', onMouseMove);
        removeEvent(doc.body, 'mouseup', onMouseUp);
        
        if ( o.onSelect )
        {
            setTimeout(function( ){
                o.onSelect.call( self, self.el, self.getSelection() );
            }, 10);
        }
        return;
    };
    
    addEvent(el, 'mousedown', el.__area_select_evt = create);
    addEvent(area.n, 'mousedown', resize);
    addEvent(area.s, 'mousedown', resize);
    addEvent(area.e, 'mousedown', resize);
    addEvent(area.w, 'mousedown', resize);
    addEvent(area.ne, 'mousedown', resize);
    addEvent(area.nw, 'mousedown', resize);
    addEvent(area.se, 'mousedown', resize);
    addEvent(area.sw, 'mousedown', resize);
    addEvent(area.main, 'mousedown', move);
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
                removeEvent(el, 'mousedown', el.__area_select_evt);
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