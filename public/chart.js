new Chart(ctx, {
    type: 'bar',
    data: {
        labels: subjects,
        datasets: [
            {
                label: 'Present Classes',
                data: presentClasses,
                backgroundColor: '#36A2EB',
            },
            {
                label: 'Absent Classes',
                data: absentClasses,
                backgroundColor: '#FF6384',
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                beginAtZero: true
            }
        }
    }
});
