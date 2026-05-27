const eventSource = new EventSource('http://localhost:3000/events');

        eventSource.onmessage = function(event) {
            const payload = JSON.parse(event.data);
            const gridTable = document.getElementById('excelGrid');
            
            gridTable.innerHTML = "";
            
            if (!payload.rows || payload.rows.length === 0) return;

            // Loop through each row of cells sent from Google
            payload.rows.forEach((row) => {
                const tr = document.createElement('tr');
                
                row.forEach((cell) => {
                    const td = document.createElement('td');
                    
                    td.textContent = cell.value;
                    
                    if (cell.background) td.style.backgroundColor = cell.background;
                    if (cell.color) td.style.color = cell.color;
                    if (cell.isBold) td.style.fontWeight = 'bold';
                    if (cell.isItalic) td.style.fontStyle = 'italic';
                    
                    tr.appendChild(td);
                });
                
                gridTable.appendChild(tr);
            });
        };
