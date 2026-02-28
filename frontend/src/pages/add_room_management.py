import re

# Read the current file
with open('ReceptionistDashboard.jsx', 'r') as f:
    content = f.read()

# Find the line with ') : (' and replace it with room management section
pattern = r')\s*:\s*\(\s*$'
replacement = ''' ) : showRoomManagement ? (
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
              ) : ('''

# Replace the pattern
new_content = re.sub(pattern, replacement, content)

# Write the modified content back
with open('ReceptionistDashboard.jsx', 'w') as f:
    f.write(new_content)

print("Room management section added successfully!")
