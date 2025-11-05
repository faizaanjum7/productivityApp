import React, { useState } from 'react';
import { Environment, Resource } from '../types';
import { PlusIcon, LinkIcon, FileTextIcon, EditIcon, TrashIcon, CheckIcon, CloseIcon } from './icons';

interface ResourceVaultProps {
    environment: Environment;
    onUpdateEnvironment: (env: Environment) => void;
}

const ResourceItem: React.FC<{
    resource: Resource;
    onUpdate: (updatedResource: Resource) => void;
    onDelete: (id: string) => void;
}> = ({ resource, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(resource.title);
    const [editedContent, setEditedContent] = useState(resource.content);

    const handleSave = () => {
        onUpdate({ ...resource, title: editedTitle, content: editedContent });
        setIsEditing(false);
    };

    const icon = resource.type === 'link' ? <LinkIcon /> : <FileTextIcon />;

    return (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
            {isEditing ? (
                <div className="space-y-2">
                    <input type="text" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} placeholder="Title" className="w-full font-semibold bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded" />
                    <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} placeholder={resource.type === 'link' ? 'URL' : 'Note'} className="w-full text-sm bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded" rows={2}/>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsEditing(false)}><CloseIcon className="w-5 h-5 text-red-500"/></button>
                        <button onClick={handleSave}><CheckIcon className="w-5 h-5 text-green-500"/></button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-gray-400">{icon}</span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{resource.title}</p>
                            {resource.type === 'link' ? 
                                <a href={resource.content} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline truncate block">{resource.content}</a> :
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{resource.content}</p>
                            }
                        </div>
                    </div>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-indigo-500"><EditIcon className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(resource.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </div>
    );
};


const ResourceVault: React.FC<ResourceVaultProps> = ({ environment, onUpdateEnvironment }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newResourceType, setNewResourceType] = useState<'link' | 'text'>('link');
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceContent, setNewResourceContent] = useState('');

    const handleAddResource = () => {
        if (!newResourceTitle.trim() || !newResourceContent.trim()) return;
        
        const newResource: Resource = {
            id: Date.now().toString(),
            title: newResourceTitle,
            type: newResourceType,
            content: newResourceContent,
        };

        onUpdateEnvironment({ ...environment, resources: [...environment.resources, newResource] });
        setIsAdding(false);
        setNewResourceTitle('');
        setNewResourceContent('');
    };

    const handleUpdateResource = (updatedResource: Resource) => {
        const updatedResources = environment.resources.map(r => r.id === updatedResource.id ? updatedResource : r);
        onUpdateEnvironment({ ...environment, resources: updatedResources });
    };

    const handleDeleteResource = (id: string) => {
        const updatedResources = environment.resources.filter(r => r.id !== id);
        onUpdateEnvironment({ ...environment, resources: updatedResources });
    }

    return (
        <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg w-full space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Resource Vault</h2>
                <button onClick={() => setIsAdding(prev => !prev)} className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-500 rounded-full hover:bg-indigo-600 transition">
                    <PlusIcon className="w-4 h-4" /> Add
                </button>
            </div>

            {isAdding && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2 animate-fade-in">
                    <div className="flex gap-2">
                        <button onClick={() => setNewResourceType('link')} className={`flex-1 py-1 text-sm rounded ${newResourceType === 'link' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Link</button>
                        <button onClick={() => setNewResourceType('text')} className={`flex-1 py-1 text-sm rounded ${newResourceType === 'text' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Note</button>
                    </div>
                    <input type="text" value={newResourceTitle} onChange={e => setNewResourceTitle(e.target.value)} placeholder="Title" className="w-full text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded" />
                    <textarea value={newResourceContent} onChange={e => setNewResourceContent(e.target.value)} placeholder={newResourceType === 'link' ? 'URL' : 'Note content...'} className="w-full text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded" rows={2}/>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600">Cancel</button>
                        <button onClick={handleAddResource} className="px-3 py-1 text-xs rounded bg-indigo-500 text-white">Save</button>
                    </div>
                </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {environment.resources.length > 0 ? (
                    environment.resources.map(res => (
                        <ResourceItem key={res.id} resource={res} onUpdate={handleUpdateResource} onDelete={handleDeleteResource} />
                    ))
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">No resources yet. Add a link or note!</p>
                )}
            </div>
        </div>
    );
};

export default ResourceVault;
