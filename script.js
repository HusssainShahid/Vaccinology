// Global variables to store parsed data
let csvData = [];
let allergenData = {};
let immunogenData = {};
let filteredResults = [];

// File upload handlers
document.addEventListener('DOMContentLoaded', function() {
    // File input event listeners
    document.getElementById('csvFile').addEventListener('change', handleCSVUpload);
    document.getElementById('allergenFile').addEventListener('change', handleAllergenUpload);
    document.getElementById('immunogenFile').addEventListener('change', handleImmunogenUpload);
    
    // Analyze button
    document.getElementById('analyzeBtn').addEventListener('click', analyzeData);
    
    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    
    // Probability filter change
    document.getElementById('probabilityFilter').addEventListener('change', function() {
        document.getElementById('selectedProbability').textContent = this.value + '%';
    });
});

// CSV File Upload Handler
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        csvData = parseCSV(text);
        
        // Show file info
        const fileInfo = document.getElementById('csvFileInfo');
        fileInfo.innerHTML = `
            <small><strong>${file.name}</strong><br>
            ${csvData.length} records</small>
        `;
        fileInfo.classList.remove('d-none');
        
        checkAllFilesUploaded();
    };
    reader.readAsText(file);
}

// Allergen File Upload Handler
function handleAllergenUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        allergenData = parseAllergenFile(text);
        
        // Show file info
        const fileInfo = document.getElementById('allergenFileInfo');
        fileInfo.innerHTML = `
            <small><strong>${file.name}</strong><br>
            ${Object.keys(allergenData).length} peptides</small>
        `;
        fileInfo.classList.remove('d-none');
        
        checkAllFilesUploaded();
    };
    reader.readAsText(file);
}

// Immunogen File Upload Handler
function handleImmunogenUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        immunogenData = parseImmunogenFile(text);
        
        // Show file info
        const fileInfo = document.getElementById('immunogenFileInfo');
        fileInfo.innerHTML = `
            <small><strong>${file.name}</strong><br>
            ${Object.keys(immunogenData).length} peptides</small>
        `;
        fileInfo.classList.remove('d-none');
        
        checkAllFilesUploaded();
    };
    reader.readAsText(file);
}

// Check if all files are uploaded
function checkAllFilesUploaded() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (csvData.length > 0 && Object.keys(allergenData).length > 0 && Object.keys(immunogenData).length > 0) {
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('btn-secondary');
        analyzeBtn.classList.add('btn-primary');
    }
}

// Parse CSV data
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index] ? values[index].trim() : '';
            });
            data.push(row);
        }
    }
    return data;
}

// Parse Allergen file
function parseAllergenFile(text) {
    const data = {};
    const lines = text.split('\n');
    let currentPeptide = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract peptide number
        const peptideMatch = line.match(/Results for protein (peptide_\d+):/);
        if (peptideMatch) {
            currentPeptide = peptideMatch[1];
        }
        
        // Extract classification
        if (line.includes('Classification based on the most similar protein:')) {
            const classification = line.split(':')[1].trim();
            if (currentPeptide) {
                data[currentPeptide] = classification;
            }
        }
    }
    return data;
}

// Parse Immunogen file
function parseImmunogenFile(text) {
    const data = {};
    const lines = text.split('\n');
    let currentPeptide = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract peptide number
        const peptideMatch = line.match(/Results for protein (peptide_\d+):/);
        if (peptideMatch) {
            currentPeptide = peptideMatch[1];
        }
        
        // Extract classification and probability
        if (line.includes('Probable IMMUNOGEN') || line.includes('Probable NON-IMMUNOGEN')) {
            const classification = line.split(' with a probability of')[0].trim();
            const probabilityMatch = line.match(/probability of (\d+)%/);
            const probability = probabilityMatch ? parseInt(probabilityMatch[1]) : null;
            
            if (currentPeptide) {
                data[currentPeptide] = {
                    classification: classification,
                    probability: probability
                };
            }
        }
    }
    return data;
}

// Main analysis function
function analyzeData() {
    // Show loading modal
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    loadingModal.show();
    
    // Simulate processing time for better UX
    setTimeout(() => {
        performAnalysis();
        loadingModal.hide();
    }, 1000);
}

// Perform the actual analysis
function performAnalysis() {
    const selectedProbability = parseInt(document.getElementById('probabilityFilter').value);
    filteredResults = [];
    
    // Filter CSV data based on criteria
    csvData.forEach(row => {
        const peptideName = row.name; // e.g., ">peptide_1"
        const peptideId = peptideName.replace('>', ''); // e.g., "peptide_1"
        
        // Check if peptide exists in both allergen and immunogen data
        if (allergenData[peptideId] && immunogenData[peptideId]) {
            const allergenClassification = allergenData[peptideId];
            const immunogenInfo = immunogenData[peptideId];
            
            // Filter for NON-ALLERGEN and IMMUNOGEN (not NON-IMMUNOGEN) with matching probability
            if (allergenClassification.includes('NON-ALLERGEN') && 
                immunogenInfo.classification.includes('IMMUNOGEN') &&
                !immunogenInfo.classification.includes('NON-IMMUNOGEN') &&
                immunogenInfo.probability === selectedProbability) {
                
                // Add classification data to the row
                const enrichedRow = {
                    ...row,
                    allergenClassification: allergenClassification,
                    immunogenClassification: immunogenInfo.classification,
                    immunogenProbability: immunogenInfo.probability + '%'
                };
                
                filteredResults.push(enrichedRow);
            }
        }
    });
    
    // Update statistics
    updateStatistics();
    
    // Display results
    displayResults();
    
    // Show sections
    document.getElementById('statsSection').style.display = 'block';
    // document.getElementById('chartsSection').style.display = 'block'; // Commented out for now
    document.getElementById('resultsSection').style.display = 'block';
    
    // Create charts - commented out for now
    // createCharts();
}

// Update statistics
function updateStatistics() {
    const totalRecords = csvData.length;
    const filteredCount = filteredResults.length;
    const successRate = totalRecords > 0 ? ((filteredCount / totalRecords) * 100).toFixed(1) : 0;
    const selectedProbability = document.getElementById('probabilityFilter').value;
    
    document.getElementById('totalRecords').textContent = totalRecords.toLocaleString();
    document.getElementById('filteredRecords').textContent = filteredCount.toLocaleString();
    document.getElementById('successRate').textContent = successRate + '%';
    document.getElementById('selectedProbability').textContent = selectedProbability + '%';
}

// Display results in table
function displayResults() {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';
    
    filteredResults.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.name}</td>
            <td>${row.allele}</td>
            <td>${row.start}</td>
            <td>${row.end}</td>
            <td>${row.length}</td>
            <td>${row.core_peptide}</td>
            <td>${row.peptide}</td>
            <td>${row.ic50}</td>
            <td>${row.rank}</td>
            <td>${row.adjusted_rank}</td>
            <td><span class="badge bg-success">${row.allergenClassification}</span></td>
            <td><span class="badge bg-primary">${row.immunogenClassification}</span></td>
            <td><span class="badge bg-info">${row.immunogenProbability}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Create charts - COMMENTED OUT FOR NOW
/*
function createCharts() {
    // Classification Distribution Chart
    const classificationCtx = document.getElementById('classificationChart').getContext('2d');
    const allergenCounts = {};
    const immunogenCounts = {};
    
    filteredResults.forEach(row => {
        allergenCounts[row.allergenClassification] = (allergenCounts[row.allergenClassification] || 0) + 1;
        immunogenCounts[row.immunogenClassification] = (immunogenCounts[row.immunogenClassification] || 0) + 1;
    });
    
    new Chart(classificationCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(immunogenCounts),
            datasets: [{
                data: Object.values(immunogenCounts),
                backgroundColor: ['#28a745', '#dc3545', '#ffc107', '#17a2b8'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Probability Distribution Chart
    const probabilityCtx = document.getElementById('probabilityChart').getContext('2d');
    const probabilityCounts = {};
    
    filteredResults.forEach(row => {
        const prob = row.immunogenProbability;
        probabilityCounts[prob] = (probabilityCounts[prob] || 0) + 1;
    });
    
    new Chart(probabilityCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(probabilityCounts),
            datasets: [{
                label: 'Count',
                data: Object.values(probabilityCounts),
                backgroundColor: '#17a2b8',
                borderColor: '#138496',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
*/

// Export to CSV
function exportToCSV() {
    if (filteredResults.length === 0) {
        alert('No data to export!');
        return;
    }
    
    // Get headers from the first result
    const headers = Object.keys(filteredResults[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    filteredResults.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes
            return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvContent += values.join(',') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vacciology_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Clear all data
function clearAll() {
    // Reset global variables
    csvData = [];
    allergenData = {};
    immunogenData = {};
    filteredResults = [];
    
    // Reset file inputs
    document.getElementById('csvFile').value = '';
    document.getElementById('allergenFile').value = '';
    document.getElementById('immunogenFile').value = '';
    
    // Hide file info
    document.getElementById('csvFileInfo').classList.add('d-none');
    document.getElementById('allergenFileInfo').classList.add('d-none');
    document.getElementById('immunogenFileInfo').classList.add('d-none');
    
    // Reset analyze button
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = true;
    analyzeBtn.classList.remove('btn-primary');
    analyzeBtn.classList.add('btn-secondary');
    
    // Hide sections
    document.getElementById('statsSection').style.display = 'none';
    // document.getElementById('chartsSection').style.display = 'none'; // Commented out for now
    document.getElementById('resultsSection').style.display = 'none';
    
    // Clear table
    document.getElementById('resultsTableBody').innerHTML = '';
    
    // Reset statistics
    document.getElementById('totalRecords').textContent = '0';
    document.getElementById('filteredRecords').textContent = '0';
    document.getElementById('successRate').textContent = '0%';
    document.getElementById('selectedProbability').textContent = '100%';
}
