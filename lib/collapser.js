/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { ReactWidget } from '@jupyterlab/apputils';
import { ElementExt } from '@lumino/domutils';
import * as React from 'react';
/**
 * The CSS class added to all collapsers.
 */
const COLLAPSER_CLASS = 'jp-Collapser';
/**
 * The CSS class added to the collapser child.
 */
const COLLAPSER_CHILD_CLASS = 'jp-Collapser-child';
/**
 * The CSS class added to input collapsers.
 */
const INPUT_COLLAPSER = 'jp-InputCollapser';
/**
 * The CSS class added to output collapsers.
 */
const OUTPUT_COLLAPSER = 'jp-OutputCollapser';
/**
 * Abstract collapser base class.
 *
 * ### Notes
 * A collapser is a visible div to the left of a cell's
 * input/output that a user can click on to collapse the
 * input/output.
 */
export class Collapser extends ReactWidget {
    /**
     * Construct a new collapser.
     */
    constructor() {
        super();
        this.addClass(COLLAPSER_CLASS);
    }
    /**
     * Is the input/output of the parent collapsed.
     */
    get collapsed() {
        return false;
    }
    /**
     * Render the collapser with the virtual DOM.
     */
    render() {
        const childClass = COLLAPSER_CHILD_CLASS;
        return React.createElement("div", { className: childClass, onClick: e => this.handleClick(e) });
    }
}
/**
 * A collapser subclass to collapse a cell's input area.
 */
export class InputCollapser extends Collapser {
    /**
     * Construct a new input collapser.
     */
    constructor() {
        super();
        this.addClass(INPUT_COLLAPSER);
    }
    /**
     * Is the cell's input collapsed?
     */
    get collapsed() {
        var _a;
        const cell = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.parent;
        if (cell) {
            return cell.inputHidden;
        }
        else {
            return false;
        }
    }
    /**
     * Handle a click event for the user to collapse the cell's input.
     */
    handleClick(e) {
        var _a;
        const cell = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.parent;
        if (cell) {
            cell.inputHidden = !cell.inputHidden;
        }
        /* We need this until we watch the cell state */
        this.update();
    }
}
/**
 * A collapser subclass to collapse a cell's output area.
 */
export class OutputCollapser extends Collapser {
    /**
     * Construct a new output collapser.
     */
    constructor() {
        super();
        this.addClass(OUTPUT_COLLAPSER);
    }
    /**
     * Is the cell's output collapsed?
     */
    get collapsed() {
        var _a;
        const cell = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.parent;
        if (cell) {
            return cell.outputHidden;
        }
        else {
            return false;
        }
    }
    /**
     * Handle a click event for the user to collapse the cell's output.
     */
    handleClick(e) {
        var _a, _b;
        const cell = (_a = this.parent) === null || _a === void 0 ? void 0 : _a.parent;
        if (cell) {
            cell.outputHidden = !cell.outputHidden;
            /* Scroll cell into view after output collapse */
            if (cell.outputHidden) {
                let area = (_b = cell.parent) === null || _b === void 0 ? void 0 : _b.node;
                if (area) {
                    ElementExt.scrollIntoViewIfNeeded(area, cell.node);
                }
            }
        }
        /* We need this until we watch the cell state */
        this.update();
    }
}
//# sourceMappingURL=collapser.js.map