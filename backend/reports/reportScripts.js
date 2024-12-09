// backend/reports/reportScripts.js

const BASE_URL = '/reports/api';
let chart;
let currentReportType = '';
let currentPeriod = '';

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const period = document.getElementById('period').value;

    if (!reportType || !period) {
        alert('Please select a report type and period.');
        return;
    }

    currentReportType = reportType;
    currentPeriod = period;

    let endpoint = '';
    switch(reportType) {
        case 'service-utilization':
            endpoint = 'service-utilization';
            break;
        case 'user-registrations':
            endpoint = 'user-registrations';
            break;
        case 'daily-peak-times':
            endpoint = 'daily-peak-times';
            break;
        case 'transaction-status':
            endpoint = 'transaction-status';
            break;
        case 'service-usage-trends':
            endpoint = 'service-usage-trends';
            break;
        default:
            alert('Invalid report type selected.');
            return;
    }

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}?period=${period}`);
        const data = await response.json();

        if (data.error) {
            alert('Error fetching report data: ' + data.error);
            return;
        }

        renderChart(reportType, data);
        document.getElementById('reportContent').style.display = 'block';
    } catch (error) {
        console.error('Error generating report:', error);
        alert('An error occurred while generating the report.');
    }
}

function renderChart(reportType, data) {
    const ctx = document.getElementById('reportChart').getContext('2d');
    const reportTitle = document.getElementById('reportTitle');

    if (chart) {
        chart.destroy();
    }

    let chartData = {};
    let chartOptions = {};
    let labels = [];
    let values = [];

    switch(reportType) {
        case 'service-utilization':
            reportTitle.innerText = 'Service Utilization Report';
            labels = data.map(item => item.service_name);
            values = data.map(item => item.total_transactions);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'Total Transactions',
                    data: values,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };
            chart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'user-registrations':
            reportTitle.innerText = 'User Registration Report';
            labels = data.map(item => item.registration_date);
            values = data.map(item => item.total_users);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'New Users',
                    data: values,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };
            chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'daily-peak-times':
            reportTitle.innerText = 'Daily Peak Time Report';
            labels = data.map(item => item.hour + ':00');
            values = data.map(item => item.total_transactions);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'Transactions',
                    data: values,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };
            chart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'transaction-status':
            reportTitle.innerText = 'Transaction Status Distribution Report';
            labels = data.map(item => item.status);
            values = data.map(item => item.total_transactions);
            chartData = {
                labels: labels,
                datasets: [{
                    label: 'Transaction Status',
                    data: values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            };
            chartOptions = {
                plugins: {
                    datalabels: {
                        color: '#fff',
                        formatter: (value, ctx) => {
                            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            let percentage = (value * 100 / sum).toFixed(2) + '%';
                            return percentage;
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
            };
            chart = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        case 'service-usage-trends':
            reportTitle.innerText = 'Service-Specific Usage Trends Report';
            const services = [...new Set(data.map(item => item.service_name))];
            const datasets = [];

            services.forEach(service => {
                const serviceData = data.filter(item => item.service_name === service);
                const serviceLabels = serviceData.map(item => item.usage_date);
                const serviceValues = serviceData.map(item => item.total_transactions);
                datasets.push({
                    label: service,
                    data: serviceValues,
                    fill: false,
                    borderColor: getRandomColor(),
                    tension: 0.1
                });
                if (labels.length === 0) {
                    labels.push(...serviceLabels);
                }
            });

            chartData = {
                labels: labels,
                datasets: datasets
            };

            chartOptions = {
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#000',
                        formatter: Math.round
                    }
                },
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            };

            chart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: chartOptions,
                plugins: [ChartDataLabels]
            });
            break;

        default:
            reportTitle.innerText = 'Unknown Report';
    }
}

async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add Garamond Font (EB Garamond as an example)
    // Note: You need to add the Garamond font file converted to Base64 and include it here.
    // For demonstration, we'll use a built-in font. To use Garamond, follow jsPDF's custom font embedding.
    // Example:
    // await doc.addFileToVFS("EBGaramond-Regular.ttf", "BASE64_ENCODED_FONT_DATA");
    // await doc.addFont("EBGaramond-Regular.ttf", "EBGaramond", "normal");
    // doc.setFont("EBGaramond");

    // Using a standard font as a placeholder
    doc.setFont("Times", "Roman");

    // Add QueueEase Report Title
    doc.setFontSize(22);
    doc.text("QueueEase Report", 105, 20, { align: "center" });

    // Add Report Name
    doc.setFontSize(16);
    doc.text(`Report: ${document.getElementById('reportTitle').innerText}`, 105, 30, { align: "center" });

    // Add Created At (PH Time)
    const phTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    doc.setFontSize(12);
    doc.text(`Created at: ${phTime}`, 105, 40, { align: "center" });

    // Add Period
    doc.text(`Period: ${formatPeriod(currentPeriod)}`, 105, 45, { align: "center" });

    // Determine image dimensions based on report type
    let imgWidth = 190; // default width
    let imgHeight = 100; // default height

    if (currentReportType === 'transaction-status') {
        // Make pie chart wider
        imgWidth = 180;
        imgHeight = 100;
    }

    // Add some space before the chart
    let imgY = 50;

    // Add the chart image
    const canvas = document.getElementById('reportChart');
    const imgData = canvas.toDataURL('image/png');

    doc.addImage(imgData, 'PNG', 20, imgY, imgWidth, imgHeight);

    // Add additional details if needed
    // For example, you can add a footer or more information below the chart

    doc.save(`QueueEase_Report_${currentReportType}_${phTime}.pdf`);
}

function formatPeriod(period) {
    switch(period) {
        case 'today':
            return 'Today';
        case 'weekly':
            return 'Last 7 Days';
        case 'monthly':
            return 'Last 30 Days';
        case 'six-months':
            return 'Last 6 Months';
        case 'annually':
            return 'Last Year';
        case 'five-years':
            return 'Last 5 Years';
        case 'ten-years':
            return 'Last 10 Years';
        default:
            return 'Custom Period';
    }
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgba(${r}, ${g}, ${b}, 1)`;
}
