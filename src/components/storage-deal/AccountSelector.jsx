import React from 'react';

const AccountSelector = ({ accounts, selectedAccount, onSelectAccount }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6 mb-4">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Select Account</h3>
                <select
                    value={selectedAccount?.address || ''}
                    onChange={(e) => {
                        const account = accounts.find(acc => acc.address === e.target.value);
                        onSelectAccount(account);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                        <option key={account.address} value={account.address}>
                            {account.meta.name} ({account.address.slice(0, 8)}...{account.address.slice(-8)})
                        </option>
                    ))}
                </select>

                {selectedAccount && (
                    <div className="text-sm text-gray-600">
                        <p><span className="font-medium">Selected Account:</span> {selectedAccount.meta.name}</p>
                        <p className="truncate"><span className="font-medium">Address:</span> {selectedAccount.address}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountSelector;
