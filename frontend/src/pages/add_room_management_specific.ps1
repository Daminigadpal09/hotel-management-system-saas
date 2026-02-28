# Read the current file
$lines = Get-Content "ReceptionistDashboard.jsx"
$newLines = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # Check if this is the line we want to replace (line 554)
    if ($i -eq 553 -and $line.Trim() -eq ") : (") {
        # Add the room management section
        $newLines += ") : showRoomManagement ? ("
        $newLines += "                <div className=""bg-white rounded-lg shadow p-6"">"
        $newLines += "                  <div className=""flex justify-between items-center mb-4"">"
        $newLines += "                    <h3 className=""text-lg font-medium text-gray-900"">Room Management</h3>"
        $newLines += "                    <button"
        $newLines += "                      onClick={() => setShowRoomManagement(false)}"
        $newLines += "                      className=""text-sm text-gray-500 hover:text-gray-700"""
        $newLines += "                    >"
        $newLines += "                      ← Back to Dashboard"
        $newLines += "                    </button>"
        $newLines += "                  </div>"
        $newLines += "                  <div className=""text-center py-8"">"
        $newLines += "                    <p className=""text-gray-500"">Room management functionality is coming soon.</p>"
        $newLines += "                  </div>"
        $newLines += "                </div>"
        $newLines += "              ) : ("
    } else {
        $newLines += $line
    }
}

# Write the modified content back
Set-Content "ReceptionistDashboard.jsx" $newLines

Write-Host "Room management section added successfully!"
