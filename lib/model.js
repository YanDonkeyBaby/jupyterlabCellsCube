/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { JSONExt } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { AttachmentsModel } from '@jupyterlab/attachments';
import { CodeEditor } from '@jupyterlab/codeeditor';
import * as models from '@jupyterlab/shared-models';
import { UUID } from '@lumino/coreutils';
import { OutputAreaModel } from '@jupyterlab/outputarea';
const globalModelDBMutex = models.createMutex();
export function isCodeCellModel(model) {
    return model.type === 'code';
}
export function isMarkdownCellModel(model) {
    return model.type === 'markdown';
}
export function isRawCellModel(model) {
    return model.type === 'raw';
}
/**
 * An implementation of the cell model.
 */
export class CellModel extends CodeEditor.Model {
    /**
     * Construct a cell model from optional cell content.
     */
    constructor(options) {
        var _a;
        super({
            modelDB: options.modelDB,
            id: options.id || ((_a = options.cell) === null || _a === void 0 ? void 0 : _a.id) || UUID.uuid4()
        });
        /**
         * A signal emitted when the state of the model changes.
         */
        this.contentChanged = new Signal(this);
        /**
         * A signal emitted when a model state changes.
         */
        this.stateChanged = new Signal(this);
        this.value.changed.connect(this.onGenericChange, this);
        const cellType = this.modelDB.createValue('type');
        cellType.set(this.type);
        const observableMetadata = this.modelDB.createMap('metadata');
        observableMetadata.changed.connect(this.onModelDBMetadataChange, this);
        observableMetadata.changed.connect(this.onGenericChange, this);
        const cell = options.cell;
        const trusted = this.modelDB.createValue('trusted');
        trusted.changed.connect(this.onTrustedChanged, this);
        if (!cell) {
            trusted.set(false);
            return;
        }
        trusted.set(!!cell.metadata['trusted']);
        delete cell.metadata['trusted'];
        // Set the text value, normalizing line endings to \n
        if (Array.isArray(cell.source)) {
            this.value.text = cell.source
                .map(s => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n'))
                .join('');
        }
        else {
            this.value.text = cell.source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        }
        const metadata = JSONExt.deepCopy(cell.metadata);
        if (this.type !== 'raw') {
            delete metadata['format'];
        }
        if (this.type !== 'code') {
            delete metadata['collapsed'];
            delete metadata['scrolled'];
        }
        for (const key in metadata) {
            observableMetadata.set(key, metadata[key]);
        }
    }
    /**
     * The type of cell.
     */
    get type() {
        // This getter really should be abstract, but our current constructor
        // depends on .type working
        return 'raw';
    }
    /**
     * The id for the cell.
     */
    get id() {
        return this.sharedModel.getId();
    }
    /**
     * The metadata associated with the cell.
     */
    get metadata() {
        return this.modelDB.get('metadata');
    }
    /**
     * Get the trusted state of the model.
     */
    get trusted() {
        return this.modelDB.getValue('trusted');
    }
    /**
     * Set the trusted state of the model.
     */
    set trusted(newValue) {
        const oldValue = this.trusted;
        if (oldValue === newValue) {
            return;
        }
        this.modelDB.setValue('trusted', newValue);
    }
    /**
     * Serialize the model to JSON.
     */
    toJSON() {
        const metadata = Object.create(null);
        for (const key of this.metadata.keys()) {
            const value = JSON.parse(JSON.stringify(this.metadata.get(key)));
            metadata[key] = value;
        }
        if (this.trusted) {
            metadata['trusted'] = true;
        }
        return {
            cell_type: this.type,
            source: this.value.text,
            metadata
        };
    }
    /**
     * Handle a change to the trusted state.
     *
     * The default implementation is a no-op.
     */
    onTrustedChanged(trusted, args) {
        /* no-op */
    }
    /**
     * When we initialize a cell model, we create a standalone model that cannot be shared in a YNotebook.
     * Call this function to re-initialize the local representation based on a fresh shared model (e.g. models.YFile or models.YCodeCell).
     *
     * @param sharedModel
     * @param reinitialize Whether to reinitialize the shared model.
     */
    switchSharedModel(sharedModel, reinitialize) {
        if (reinitialize) {
            const newValue = sharedModel.getMetadata();
            if (newValue) {
                this._updateModelDBMetadata(newValue);
            }
        }
        super.switchSharedModel(sharedModel, reinitialize);
    }
    /**
     * Handle a change to the cell metadata modelDB and reflect it in the shared model.
     */
    onModelDBMetadataChange(sender, event) {
        const metadata = this.sharedModel.getMetadata();
        globalModelDBMutex(() => {
            switch (event.type) {
                case 'add':
                    this._changeCellMetadata(metadata, event);
                    break;
                case 'change':
                    this._changeCellMetadata(metadata, event);
                    break;
                case 'remove':
                    delete metadata[event.key];
                    break;
                default:
                    throw new Error(`Invalid event type: ${event.type}`);
            }
            this.sharedModel.setMetadata(metadata);
        });
    }
    /**
     * Change the cell metadata for a given event.
     *
     * @param metadata The cell metadata.
     * @param event The event to handle.
     */
    _changeCellMetadata(metadata, event) {
        switch (event.key) {
            case 'jupyter':
                metadata.jupyter = event.newValue;
                break;
            case 'collapsed':
                metadata.collapsed = event.newValue;
                break;
            case 'name':
                metadata.name = event.newValue;
                break;
            case 'scrolled':
                metadata.scrolled = event.newValue;
                break;
            case 'tags':
                metadata.tags = event.newValue;
                break;
            case 'trusted':
                metadata.trusted = event.newValue;
                break;
            default:
                // The default is applied for custom metadata that are not
                // defined in the official nbformat but which are defined
                // by the user.
                metadata[event.key] = event.newValue;
        }
    }
    /**
     * Handle a change to the cell shared model and reflect it in modelDB.
     * We update the modeldb metadata when the shared model changes.
     *
     * This method overrides the CodeEditor protected _onSharedModelChanged
     * so we first call super._onSharedModelChanged
     *
     * @override CodeEditor._onSharedModelChanged
     */
    _onSharedModelChanged(sender, change) {
        super._onSharedModelChanged(sender, change);
        globalModelDBMutex(() => {
            var _a;
            if (change.metadataChange) {
                const newValue = (_a = change.metadataChange) === null || _a === void 0 ? void 0 : _a.newValue;
                if (newValue) {
                    this._updateModelDBMetadata(newValue);
                }
            }
        });
    }
    _updateModelDBMetadata(metadata) {
        Object.keys(metadata).map(key => {
            switch (key) {
                case 'collapsed':
                    this.metadata.set('collapsed', metadata.jupyter);
                    break;
                case 'jupyter':
                    this.metadata.set('jupyter', metadata.jupyter);
                    break;
                case 'name':
                    this.metadata.set('name', metadata.name);
                    break;
                case 'scrolled':
                    this.metadata.set('scrolled', metadata.scrolled);
                    break;
                case 'tags':
                    this.metadata.set('tags', metadata.tags);
                    break;
                case 'trusted':
                    this.metadata.set('trusted', metadata.trusted);
                    break;
                default:
                    // The default is applied for custom metadata that are not
                    // defined in the official nbformat but which are defined
                    // by the user.
                    this.metadata.set(key, metadata[key]);
            }
        });
    }
    /**
     * Handle a change to the observable value.
     */
    onGenericChange() {
        this.contentChanged.emit(void 0);
    }
}
/**
 * A base implementation for cell models with attachments.
 */
export class AttachmentsCellModel extends CellModel {
    /**
     * Construct a new cell with optional attachments.
     */
    constructor(options) {
        super(options);
        const factory = options.contentFactory || AttachmentsCellModel.defaultContentFactory;
        let attachments;
        const cell = options.cell;
        if (cell && (cell.cell_type === 'raw' || cell.cell_type === 'markdown')) {
            attachments = cell
                .attachments;
        }
        this._attachments = factory.createAttachmentsModel({
            values: attachments,
            modelDB: this.modelDB
        });
        this._attachments.stateChanged.connect(this.onGenericChange, this);
    }
    /**
     * Get the attachments of the model.
     */
    get attachments() {
        return this._attachments;
    }
    /**
     * Serialize the model to JSON.
     */
    toJSON() {
        const cell = super.toJSON();
        if (this.attachments.length) {
            cell.attachments = this.attachments.toJSON();
        }
        return cell;
    }
}
/**
 * The namespace for `AttachmentsCellModel` statics.
 */
(function (AttachmentsCellModel) {
    /**
     * The default implementation of an `IContentFactory`.
     */
    class ContentFactory {
        /**
         * Create an attachments model.
         */
        createAttachmentsModel(options) {
            return new AttachmentsModel(options);
        }
    }
    AttachmentsCellModel.ContentFactory = ContentFactory;
    /**
     * The shared `ContentFactory` instance.
     */
    AttachmentsCellModel.defaultContentFactory = new ContentFactory();
})(AttachmentsCellModel || (AttachmentsCellModel = {}));
/**
 * An implementation of a raw cell model.
 */
export class RawCellModel extends AttachmentsCellModel {
    /**
     * The type of the cell.
     */
    get type() {
        return 'raw';
    }
    /**
     * Serialize the model to JSON.
     */
    toJSON() {
        const cell = super.toJSON();
        cell.id = this.id;
        return cell;
    }
}
/**
 * An implementation of a markdown cell model.
 */
export class MarkdownCellModel extends AttachmentsCellModel {
    /**
     * Construct a markdown cell model from optional cell content.
     */
    constructor(options) {
        super(options);
        // Use the Github-flavored markdown mode.
        this.mimeType = 'text/x-ipythongfm';
    }
    /**
     * The type of the cell.
     */
    get type() {
        return 'markdown';
    }
    /**
     * Serialize the model to JSON.
     */
    toJSON() {
        const cell = super.toJSON();
        cell.id = this.id;
        return cell;
    }
}
/**
 * An implementation of a code cell Model.
 */
export class CodeCellModel extends CellModel {
    /**
     * Construct a new code cell with optional original cell content.
     */
    constructor(options) {
        var _a;
        super(options);
        this._executedCode = '';
        this._isDirty = false;
        const factory = options.contentFactory || CodeCellModel.defaultContentFactory;
        const trusted = this.trusted;
        const cell = options.cell;
        let outputs = [];
        const executionCount = this.modelDB.createValue('executionCount');
        if (!executionCount.get()) {
            if (cell && cell.cell_type === 'code') {
                executionCount.set(cell.execution_count || null);
                outputs = (_a = cell.outputs) !== null && _a !== void 0 ? _a : [];
                // If execution count is not null presume the input code was the latest executed
                // TODO load from the notebook file when the dirty state is stored in it
                if (cell.execution_count != null) {
                    // True if execution_count is null or undefined
                    this._executedCode = this.value.text.trim();
                }
            }
            else {
                executionCount.set(null);
            }
        }
        this.value.changed.connect(this._onValueChanged, this);
        executionCount.changed.connect(this._onExecutionCountChanged, this);
        globalModelDBMutex(() => {
            const sharedCell = this.sharedModel;
            sharedCell.setOutputs(outputs);
        });
        this._outputs = factory.createOutputArea({ trusted, values: outputs });
        this._outputs.changed.connect(this.onGenericChange, this);
        this._outputs.changed.connect(this.onModelDBOutputsChange, this);
        // We keep `collapsed` and `jupyter.outputs_hidden` metadata in sync, since
        // they are redundant in nbformat 4.4. See
        // https://github.com/jupyter/nbformat/issues/137
        this.metadata.changed.connect(Private.collapseChanged, this);
        // Sync `collapsed` and `jupyter.outputs_hidden` for the first time, giving
        // preference to `collapsed`.
        if (this.metadata.has('collapsed')) {
            const collapsed = this.metadata.get('collapsed');
            Private.collapseChanged(this.metadata, {
                type: 'change',
                key: 'collapsed',
                oldValue: collapsed,
                newValue: collapsed
            });
        }
        else if (this.metadata.has('jupyter')) {
            const jupyter = this.metadata.get('jupyter');
            if (jupyter.hasOwnProperty('outputs_hidden')) {
                Private.collapseChanged(this.metadata, {
                    type: 'change',
                    key: 'jupyter',
                    oldValue: jupyter,
                    newValue: jupyter
                });
            }
        }
    }
    switchSharedModel(sharedModel, reinitialize) {
        if (reinitialize) {
            this.clearExecution();
            sharedModel.getOutputs().forEach(output => this._outputs.add(output));
        }
        super.switchSharedModel(sharedModel, reinitialize);
    }
    /**
     * The type of the cell.
     */
    get type() {
        return 'code';
    }
    /**
     * The execution count of the cell.
     */
    get executionCount() {
        return this.modelDB.has('executionCount')
            ? this.modelDB.getValue('executionCount')
            : null;
    }
    set executionCount(newValue) {
        const oldValue = this.executionCount;
        if (newValue === oldValue) {
            return;
        }
        this.modelDB.setValue('executionCount', newValue || null);
    }
    /**
     * Whether the cell is dirty or not.
     *
     * A cell is dirty if it is output is not empty and does not
     * result of the input code execution.
     */
    get isDirty() {
        // Test could be done dynamically with this._executedCode
        // but for performance reason, the diff status is stored in a boolean.
        return this._isDirty;
    }
    /**
     * Set whether the cell is dirty or not.
     */
    _setDirty(v) {
        if (v !== this._isDirty) {
            if (!v) {
                this._executedCode = this.value.text.trim();
            }
            this._isDirty = v;
            this.stateChanged.emit({
                name: 'isDirty',
                oldValue: !v,
                newValue: v
            });
        }
    }
    clearExecution() {
        this.outputs.clear();
        this.executionCount = null;
        this._setDirty(false);
        this.metadata.delete('execution');
    }
    /**
     * The cell outputs.
     */
    get outputs() {
        return this._outputs;
    }
    /**
     * Dispose of the resources held by the model.
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this._outputs.dispose();
        this._outputs = null;
        super.dispose();
    }
    /**
     * Serialize the model to JSON.
     */
    toJSON() {
        const cell = super.toJSON();
        cell.execution_count = this.executionCount || null;
        cell.outputs = this.outputs.toJSON();
        cell.id = this.id;
        return cell;
    }
    /**
     * Handle a change to the trusted state.
     */
    onTrustedChanged(trusted, args) {
        if (this._outputs) {
            this._outputs.trusted = args.newValue;
        }
        this.stateChanged.emit({
            name: 'trusted',
            oldValue: args.oldValue,
            newValue: args.newValue
        });
    }
    /**
     * Handle a change to the cell outputs modelDB and reflect it in the shared model.
     */
    onModelDBOutputsChange(sender, event) {
        const codeCell = this.sharedModel;
        globalModelDBMutex(() => {
            switch (event.type) {
                case 'add': {
                    const outputs = event.newValues.map(output => output.toJSON());
                    codeCell.updateOutputs(event.newIndex, event.newIndex + outputs.length, outputs);
                    break;
                }
                case 'set': {
                    const newValues = event.newValues.map(output => output.toJSON());
                    codeCell.updateOutputs(event.oldIndex, event.oldIndex + newValues.length, newValues);
                    break;
                }
                case 'remove':
                    codeCell.updateOutputs(event.oldIndex, event.oldValues.length);
                    break;
                default:
                    throw new Error(`Invalid event type: ${event.type}`);
            }
        });
    }
    /**
     * Handle a change to the code cell value.
     */
    _onValueChanged() {
        if (this.executionCount !== null) {
            this._setDirty(this._executedCode !== this.value.text.trim());
        }
    }
    /**
     * Handle a change to the output shared model and reflect it in modelDB.
     * We update the modeldb metadata when the nbcell changes.
     *
     * This method overrides the CellModel protected _onSharedModelChanged
     * so we first call super._onSharedModelChanged
     *
     * @override CellModel._onSharedModelChanged
     */
    _onSharedModelChanged(sender, change) {
        super._onSharedModelChanged(sender, change);
        globalModelDBMutex(() => {
            if (change.outputsChange) {
                this.clearExecution();
                sender.getOutputs().forEach(output => this._outputs.add(output));
            }
            if (change.executionCountChange) {
                this.executionCount = change.executionCountChange.newValue
                    ? change.executionCountChange.newValue
                    : null;
            }
        });
    }
    /**
     * Handle a change to the execution count.
     */
    _onExecutionCountChanged(count, args) {
        const codeCell = this.sharedModel;
        globalModelDBMutex(() => {
            codeCell.execution_count = args.newValue
                ? args.newValue
                : null;
        });
        this.contentChanged.emit(void 0);
        this.stateChanged.emit({
            name: 'executionCount',
            oldValue: args.oldValue,
            newValue: args.newValue
        });
        if (args.newValue && this.isDirty) {
            this._setDirty(false);
        }
    }
}
/**
 * The namespace for `CodeCellModel` statics.
 */
(function (CodeCellModel) {
    /**
     * The default implementation of an `IContentFactory`.
     */
    class ContentFactory {
        /**
         * Create an output area.
         */
        createOutputArea(options) {
            return new OutputAreaModel(options);
        }
    }
    CodeCellModel.ContentFactory = ContentFactory;
    /**
     * The shared `ContentFactory` instance.
     */
    CodeCellModel.defaultContentFactory = new ContentFactory();
})(CodeCellModel || (CodeCellModel = {}));
var Private;
(function (Private) {
    function collapseChanged(metadata, args) {
        if (args.key === 'collapsed') {
            const jupyter = (metadata.get('jupyter') || {});
            const { outputs_hidden } = jupyter, newJupyter = __rest(jupyter, ["outputs_hidden"]);
            if (outputs_hidden !== args.newValue) {
                if (args.newValue !== undefined) {
                    newJupyter['outputs_hidden'] = args.newValue;
                }
                if (Object.keys(newJupyter).length === 0) {
                    metadata.delete('jupyter');
                }
                else {
                    metadata.set('jupyter', newJupyter);
                }
            }
        }
        else if (args.key === 'jupyter') {
            const jupyter = (args.newValue || {});
            if (jupyter.hasOwnProperty('outputs_hidden')) {
                metadata.set('collapsed', jupyter.outputs_hidden);
            }
            else {
                metadata.delete('collapsed');
            }
        }
    }
    Private.collapseChanged = collapseChanged;
})(Private || (Private = {}));
//# sourceMappingURL=model.js.map