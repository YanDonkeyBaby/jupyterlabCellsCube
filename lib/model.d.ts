import { ISignal, Signal } from '@lumino/signaling';
import { IAttachmentsModel } from '@jupyterlab/attachments';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IChangedArgs } from '@jupyterlab/coreutils';
import * as nbformat from '@jupyterlab/nbformat';
import * as models from '@jupyterlab/shared-models';
import { IModelDB, IObservableJSON, IObservableValue, ObservableValue } from '@jupyterlab/observables';
import { IOutputAreaModel } from '@jupyterlab/outputarea';
/**
 * The definition of a model object for a cell.
 */
export interface ICellModel extends CodeEditor.IModel {
    /**
     * The type of the cell.
     */
    readonly type: nbformat.CellType;
    /**
     * A unique identifier for the cell.
     */
    readonly id: string;
    /**
     * A signal emitted when the content of the model changes.
     */
    readonly contentChanged: ISignal<ICellModel, void>;
    /**
     * A signal emitted when a model state changes.
     */
    readonly stateChanged: ISignal<ICellModel, IChangedArgs<any>>;
    /**
     * Whether the cell is trusted.
     */
    trusted: boolean;
    /**
     * The metadata associated with the cell.
     */
    readonly metadata: IObservableJSON;
    readonly sharedModel: models.ISharedCell & models.ISharedText;
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.ICell;
}
/**
 * The definition of a model cell object for a cell with attachments.
 */
export interface IAttachmentsCellModel extends ICellModel {
    /**
     * The cell attachments
     */
    readonly attachments: IAttachmentsModel;
}
/**
 * The definition of a code cell.
 */
export interface ICodeCellModel extends ICellModel {
    /**
     * The type of the cell.
     *
     * #### Notes
     * This is a read-only property.
     */
    readonly type: 'code';
    /**
     * Whether the code cell has been edited since the last run.
     */
    readonly isDirty: boolean;
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.ICodeCell;
    /**
     * The code cell's prompt number. Will be null if the cell has not been run.
     */
    executionCount: nbformat.ExecutionCount;
    /**
     * The cell outputs.
     */
    readonly outputs: IOutputAreaModel;
    /**
     * Clear execution, outputs, and related metadata
     */
    clearExecution(): void;
}
/**
 * The definition of a markdown cell.
 */
export interface IMarkdownCellModel extends IAttachmentsCellModel {
    /**
     * The type of the cell.
     */
    readonly type: 'markdown';
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IMarkdownCell;
}
/**
 * The definition of a raw cell.
 */
export interface IRawCellModel extends IAttachmentsCellModel {
    /**
     * The type of the cell.
     */
    readonly type: 'raw';
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IRawCell;
}
export declare function isCodeCellModel(model: ICellModel): model is ICodeCellModel;
export declare function isMarkdownCellModel(model: ICellModel): model is IMarkdownCellModel;
export declare function isRawCellModel(model: ICellModel): model is IRawCellModel;
/**
 * An implementation of the cell model.
 */
export declare class CellModel extends CodeEditor.Model implements ICellModel {
    /**
     * Construct a cell model from optional cell content.
     */
    constructor(options: CellModel.IOptions);
    /**
     * The type of cell.
     */
    get type(): nbformat.CellType;
    /**
     * A signal emitted when the state of the model changes.
     */
    readonly contentChanged: Signal<this, void>;
    /**
     * A signal emitted when a model state changes.
     */
    readonly stateChanged: Signal<this, IChangedArgs<any, any, string>>;
    /**
     * The id for the cell.
     */
    get id(): string;
    /**
     * The metadata associated with the cell.
     */
    get metadata(): IObservableJSON;
    /**
     * Get the trusted state of the model.
     */
    get trusted(): boolean;
    /**
     * Set the trusted state of the model.
     */
    set trusted(newValue: boolean);
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.ICell;
    /**
     * Handle a change to the trusted state.
     *
     * The default implementation is a no-op.
     */
    onTrustedChanged(trusted: IObservableValue, args: ObservableValue.IChangedArgs): void;
    /**
     * When we initialize a cell model, we create a standalone model that cannot be shared in a YNotebook.
     * Call this function to re-initialize the local representation based on a fresh shared model (e.g. models.YFile or models.YCodeCell).
     *
     * @param sharedModel
     * @param reinitialize Whether to reinitialize the shared model.
     */
    switchSharedModel(sharedModel: models.ISharedCodeCell, reinitialize?: boolean): void;
    /**
     * Handle a change to the cell metadata modelDB and reflect it in the shared model.
     */
    protected onModelDBMetadataChange(sender: IObservableJSON, event: IObservableJSON.IChangedArgs): void;
    /**
     * Change the cell metadata for a given event.
     *
     * @param metadata The cell metadata.
     * @param event The event to handle.
     */
    private _changeCellMetadata;
    /**
     * Handle a change to the cell shared model and reflect it in modelDB.
     * We update the modeldb metadata when the shared model changes.
     *
     * This method overrides the CodeEditor protected _onSharedModelChanged
     * so we first call super._onSharedModelChanged
     *
     * @override CodeEditor._onSharedModelChanged
     */
    protected _onSharedModelChanged(sender: models.ISharedCodeCell, change: models.CellChange<models.ISharedBaseCellMetadata>): void;
    private _updateModelDBMetadata;
    /**
     * Handle a change to the observable value.
     */
    protected onGenericChange(): void;
    sharedModel: models.ISharedCell;
}
/**
 * The namespace for `CellModel` statics.
 */
export declare namespace CellModel {
    /**
     * The options used to initialize a `CellModel`.
     */
    interface IOptions {
        /**
         * The source cell data.
         */
        cell?: nbformat.IBaseCell;
        /**
         * An IModelDB in which to store cell data.
         */
        modelDB?: IModelDB;
        /**
         * A unique identifier for this cell.
         */
        id?: string;
    }
}
/**
 * A base implementation for cell models with attachments.
 */
export declare class AttachmentsCellModel extends CellModel {
    /**
     * Construct a new cell with optional attachments.
     */
    constructor(options: AttachmentsCellModel.IOptions);
    /**
     * Get the attachments of the model.
     */
    get attachments(): IAttachmentsModel;
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IRawCell | nbformat.IMarkdownCell;
    private _attachments;
}
/**
 * The namespace for `AttachmentsCellModel` statics.
 */
export declare namespace AttachmentsCellModel {
    /**
     * The options used to initialize a `AttachmentsCellModel`.
     */
    interface IOptions extends CellModel.IOptions {
        /**
         * The factory for attachment model creation.
         */
        contentFactory?: IContentFactory;
    }
    /**
     * A factory for creating code cell model content.
     */
    interface IContentFactory {
        /**
         * Create an output area.
         */
        createAttachmentsModel(options: IAttachmentsModel.IOptions): IAttachmentsModel;
    }
    /**
     * The default implementation of an `IContentFactory`.
     */
    class ContentFactory implements IContentFactory {
        /**
         * Create an attachments model.
         */
        createAttachmentsModel(options: IAttachmentsModel.IOptions): IAttachmentsModel;
    }
    /**
     * The shared `ContentFactory` instance.
     */
    const defaultContentFactory: ContentFactory;
}
/**
 * An implementation of a raw cell model.
 */
export declare class RawCellModel extends AttachmentsCellModel {
    /**
     * The type of the cell.
     */
    get type(): 'raw';
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IRawCell;
}
/**
 * An implementation of a markdown cell model.
 */
export declare class MarkdownCellModel extends AttachmentsCellModel {
    /**
     * Construct a markdown cell model from optional cell content.
     */
    constructor(options: CellModel.IOptions);
    /**
     * The type of the cell.
     */
    get type(): 'markdown';
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IMarkdownCell;
}
/**
 * An implementation of a code cell Model.
 */
export declare class CodeCellModel extends CellModel implements ICodeCellModel {
    /**
     * Construct a new code cell with optional original cell content.
     */
    constructor(options: CodeCellModel.IOptions);
    switchSharedModel(sharedModel: models.ISharedCodeCell, reinitialize?: boolean): void;
    /**
     * The type of the cell.
     */
    get type(): 'code';
    /**
     * The execution count of the cell.
     */
    get executionCount(): nbformat.ExecutionCount;
    set executionCount(newValue: nbformat.ExecutionCount);
    /**
     * Whether the cell is dirty or not.
     *
     * A cell is dirty if it is output is not empty and does not
     * result of the input code execution.
     */
    get isDirty(): boolean;
    /**
     * Set whether the cell is dirty or not.
     */
    private _setDirty;
    clearExecution(): void;
    /**
     * The cell outputs.
     */
    get outputs(): IOutputAreaModel;
    /**
     * Dispose of the resources held by the model.
     */
    dispose(): void;
    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.ICodeCell;
    /**
     * Handle a change to the trusted state.
     */
    onTrustedChanged(trusted: IObservableValue, args: ObservableValue.IChangedArgs): void;
    /**
     * Handle a change to the cell outputs modelDB and reflect it in the shared model.
     */
    protected onModelDBOutputsChange(sender: IOutputAreaModel, event: IOutputAreaModel.ChangedArgs): void;
    /**
     * Handle a change to the code cell value.
     */
    private _onValueChanged;
    /**
     * Handle a change to the output shared model and reflect it in modelDB.
     * We update the modeldb metadata when the nbcell changes.
     *
     * This method overrides the CellModel protected _onSharedModelChanged
     * so we first call super._onSharedModelChanged
     *
     * @override CellModel._onSharedModelChanged
     */
    protected _onSharedModelChanged(sender: models.ISharedCodeCell, change: models.CellChange<models.ISharedBaseCellMetadata>): void;
    /**
     * Handle a change to the execution count.
     */
    private _onExecutionCountChanged;
    private _executedCode;
    private _isDirty;
    private _outputs;
}
/**
 * The namespace for `CodeCellModel` statics.
 */
export declare namespace CodeCellModel {
    /**
     * The options used to initialize a `CodeCellModel`.
     */
    interface IOptions extends CellModel.IOptions {
        /**
         * The factory for output area model creation.
         */
        contentFactory?: IContentFactory;
    }
    /**
     * A factory for creating code cell model content.
     */
    interface IContentFactory {
        /**
         * Create an output area.
         */
        createOutputArea(options: IOutputAreaModel.IOptions): IOutputAreaModel;
    }
    /**
     * The default implementation of an `IContentFactory`.
     */
    class ContentFactory implements IContentFactory {
        /**
         * Create an output area.
         */
        createOutputArea(options: IOutputAreaModel.IOptions): IOutputAreaModel;
    }
    /**
     * The shared `ContentFactory` instance.
     */
    const defaultContentFactory: ContentFactory;
}
