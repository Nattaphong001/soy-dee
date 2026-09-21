/**
 * app.js - ฟังก์ชันการทำงานสำหรับ UI แดชบอร์ด
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. จัดการ Horizontal Navigation Bar Menu
    const setupHorizontalNav = () => {
        const navItems = document.querySelectorAll('.nav-icon-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                // เอาสถานะ active ออกจากทุกเมนู
                navItems.forEach(nav => nav.classList.remove('active'));
                // เพิ่มสถานะ active ให้เมนูที่ถูกกด
                this.classList.add('active');
            });
        });
    };

    // 2. จัดการคำนวณและแสดงผล BMI Visual Gauge แบบมี Animation
    const renderBMIGauge = () => {
        const bmiElement = document.getElementById('bmiValue');
        const bmiStatusElement = document.getElementById('bmiStatus');
        const pointer = document.getElementById('bmiPointer');
        
        // ดึงค่า BMI
        const bmiValue = parseFloat(bmiElement.innerText);
        if (isNaN(bmiValue)) return;

        let statusText = '';
        let colorCode = '';
        let percentage = 0;

        // ลอจิกจำแนกเกณฑ์และสีพาสเทล
        // การคำนวณตำแหน่งเปอร์เซ็นต์ (เพื่อให้จุดบนกราฟอยู่ถูกตำแหน่ง)
        // สมมติฐาน: แถบ Track แบ่งเป็น 4 ช่วงเท่าๆ กัน (ช่วงละ 25%)
        // 0-25% (Underweight, BMI < 18.5)
        // 25-50% (Normal, BMI 18.5 - 24.9)
        // 50-75% (Overweight, BMI 25 - 29.9)
        // 75-100% (Obese, BMI 30+)

        if (bmiValue < 18.5) {
            statusText = 'Underweight';
            colorCode = 'var(--pastel-blue)';
            // แมปค่า BMI ต่ำกว่า 18.5 ให้อยู่ในช่วง 5% - 20%
            percentage = Math.max(5, (bmiValue / 18.5) * 20); 
        } else if (bmiValue >= 18.5 && bmiValue < 25) {
            statusText = 'Normal';
            colorCode = '#66C38A'; // สีเขียวเข้มขึ้นนิดหน่อยสำหรับ Text เพื่อให้อ่านง่าย
            // แมปค่า BMI 18.5-24.9 ให้อยู่ในช่วง 25% - 50%
            percentage = 25 + ((bmiValue - 18.5) / (25 - 18.5)) * 25;
        } else if (bmiValue >= 25 && bmiValue < 30) {
            statusText = 'Overweight';
            colorCode = '#D4C000'; // สีเหลืองทองสำหรับ Text
            // แมปค่า BMI 25-29.9 ให้อยู่ในช่วง 50% - 75%
            percentage = 50 + ((bmiValue - 25) / (30 - 25)) * 25;
        } else {
            statusText = 'Obese';
            colorCode = '#FF6961'; 
            // แมปค่า BMI 30+ ให้อยู่ในช่วง 75% - 95%
            percentage = Math.min(95, 75 + ((bmiValue - 30) / 10) * 20);
        }

        // อัปเดต UI ข้อความและสี
        bmiStatusElement.innerText = statusText;
        bmiStatusElement.style.color = colorCode;
        // ปรับพื้นหลังให้โปร่งแสงจากสีตัวอักษร
        bmiStatusElement.style.backgroundColor = colorCode.replace(')', ', 0.15)').replace('var', 'rgba'); 
        
        // เซ็ตพื้นหลังให้ Tag แบบ Hardcode ง่ายๆ หากใช้ Hex
        if(colorCode.startsWith('#')) {
            // แปลง Hex เป็น RGBA (คร่าวๆ สำหรับ UI)
            bmiStatusElement.style.backgroundColor = colorCode + '25'; // เพิ่ม alpha 15%
        }

        // อนิเมชันเลื่อน Pointer ไปยังจุดที่คำนวณไว้
        setTimeout(() => {
            pointer.style.left = `${percentage}%`;
        }, 150); // ดีเลย์เล็กน้อยเพื่อให้ UI เรนเดอร์ก่อน
    };

    // เรียกใช้งานฟังก์ชัน
    setupHorizontalNav();
    renderBMIGauge();
});