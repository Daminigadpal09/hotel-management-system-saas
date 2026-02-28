# Read the current file
$content = Get-Content "ReceptionistDashboard.jsx" -Raw

# Define the pattern and replacement
$pattern = '\)\s*:\s*\(\s*$'
$replacement = @'
) : showRoomManagement ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Room Management</h3>
                    <button
                      onClick={() => setShowRoomManagement(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Back to Dashboard
                    </button>
                  </div>
                  <div className="text-center py-8">
                    <p className="text-gray-500">Room management functionality is coming soon.</p>
                  </div>
                </div>
              ) : (
'@

# Replace the pattern
$newContent = $content -replace $pattern, $replacement

# Write the modified content back
Set-Content "ReceptionistDashboard.jsx" $newContent

Write-Host "Room management section added successfully!"
