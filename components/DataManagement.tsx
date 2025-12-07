import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Settings } from 'lucide-react';

export const DataManagement: React.FC = () => {
  const { 
    exportData, 
    importData, 
    clearAllData,
    theme
  } = useContext(AppContext);
  const [importStatus, setImportStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importData(file);
      if (result.success && result.user) {
        setImportStatus({ type: 'success', message: 'Data imported successfully!' });
        // The App component will handle updating the user data
      } else {
        setImportStatus({ type: 'error', message: result.error || 'Failed to import data' });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({ type: 'error', message: 'An error occurred during import' });
    } finally {
      // Clear the file input
      e.target.value = '';
    }
  };

  const handleExport = () => {
    const success = exportData();
    if (success) {
      setImportStatus({ type: 'success', message: 'Data exported successfully!' });
    } else {
      setImportStatus({ type: 'error', message: 'Failed to export data' });
    }
  };

  const handleClearData = () => {
    if (clearAllData()) {
      setShowConfirmClear(false);
      setImportStatus({ type: 'success', message: 'All data has been cleared' });
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" />
        <h2 className="text-xl font-semibold">Data Management</h2>
      </div>

      {/* Import Section */}
      <div className="space-y-2">
        <h3 className="font-medium">Import Data</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Import your data from a previously exported backup file.
        </p>
        <div className="flex items-center gap-2">
          <label 
            className={`px-4 py-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            Choose File
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              className="hidden" 
            />
          </label>
          <span className="text-sm text-gray-500">JSON format only</span>
        </div>
      </div>

      {/* Export Section */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="font-medium">Export Data</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Download a backup of all your data.
        </p>
        <button
          onClick={handleExport}
          className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          Export Data
        </button>
      </div>

      {/* Clear Data Section */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-red-500">Danger Zone</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Permanently delete all your data. This action cannot be undone.
        </p>
        {showConfirmClear ? (
          <div className="space-y-2">
            <p className="text-sm text-red-500">Are you sure? This will delete all your data.</p>
            <div className="flex gap-2">
              <button
                onClick={handleClearData}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="px-4 py-2 text-red-500 border border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Clear All Data
          </button>
        )}
      </div>

      {/* Status Messages */}
      {importStatus && (
        <div 
          className={`mt-4 p-3 rounded-lg ${
            importStatus.type === 'success' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {importStatus.message}
        </div>
      )}
    </div>
  );
};

export default DataManagement;
