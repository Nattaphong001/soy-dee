/* ==============================================================================
   ADMIN / MAIN — เริ่มต้นหน้า: เมนูหลัก, ออกจากระบบ, ปิดแถบแจ้งเตือน, เลือกแท็บแรก
   โหลดหลังสุด (หลังโมดูลอื่นลงทะเบียน Adm.tabs.register กันหมดแล้ว)
   ============================================================================== */
document.addEventListener('DOMContentLoaded', function () {
    I18N.apply(ADMIN_I18N);

    var user = SoyDeeAPI.session.getUser();
    if (user) document.getElementById('whoami').textContent = user.full_name || user.username || '';

    document.querySelectorAll('.adm-nav-item[data-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            location.hash = btn.dataset.tab;
            Adm.tabs.show(btn.dataset.tab);
        });
    });

    document.getElementById('admAlertClose').addEventListener('click', Adm.clearAlert);

    function confirmLogout() {
        showConfirm({
            title: Adm.t('confirm-logout-title'),
            message: Adm.t('confirm-logout-message'),
            confirmText: Adm.t('confirm-logout-confirm'),
            cancelText: Adm.t('btn-cancel'),
            onConfirm: function () { SoyDeeAPI.logout(); }
        });
    }
    document.getElementById('adminLogoutBtn').addEventListener('click', confirmLogout);

    var validTabs = Array.prototype.map.call(document.querySelectorAll('.adm-nav-item[data-tab]'), function (b) { return b.dataset.tab; });
    var wanted = location.hash.slice(1);
    Adm.tabs.show(validTabs.indexOf(wanted) !== -1 ? wanted : 'overview');
});
