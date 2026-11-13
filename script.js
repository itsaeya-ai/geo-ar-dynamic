// Функция загрузки реальных мест вокруг координат пользователя (через бесплатный Overpass API)
async function loadPlaces(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const radius = 400; // радиус поиска в метрах

    const statusDiv = document.getElementById('status');
    statusDiv.innerText = `Ищем места вокруг (${lat.toFixed(4)}, ${lng.toFixed(4)})...`;

    // Запрос к OpenStreetMap: ищем кафе, рестораны, магазины, учебные заведения и достопримечательности с названиями
    const query = `
        [out:json][timeout:15];
        (
          node["name"]["amenity"](around:${radius},${lat},${lng});
          node["name"]["shop"](around:${radius},${lat},${lng});
          node["name"]["tourism"](around:${radius},${lat},${lng});
        );
        out body 15;
    `;

    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    try {
        const response = await fetch(url);
        const data = await response.json();

        const places = data.elements.map((el) => ({
            name: el.tags.name,
            location: {
                lat: el.lat,
                lng: el.lon
            }
        }));

        if (places.length === 0) {
            statusDiv.innerText = 'Рядом в радиусе 400 м объектов с названиями не найдено.';
            return;
        }

        statusDiv.innerText = `Найдено мест: ${places.length}. Покрутите камерой вокруг!`;
        renderPlaces(places);
    } catch (error) {
        statusDiv.innerText = 'Ошибка загрузки мест из API. Проверьте интернет.';
        console.error(error);
    }
}

// Отрисовка мест на AR-сцене в виде интерактивных меток <a-link>
function renderPlaces(places) {
    const scene = document.querySelector('a-scene');

    places.forEach((place) => {
        const latitude = place.location.lat;
        const longitude = place.location.lng;

        // Создаем сущность a-link (как в третьем способе статьи)
        const placeEntity = document.createElement('a-link');
        placeEntity.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);
        placeEntity.setAttribute('title', place.name);
        placeEntity.setAttribute('href', `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
        placeEntity.setAttribute('scale', '15 15 15');

        // Плавная анимация появления при загрузке
        placeEntity.addEventListener('loaded', () => {
            window.dispatchEvent(new CustomEvent('gps-entity-place-loaded'));
        });

        scene.appendChild(placeEntity);
    });
}

// Запуск при загрузке страницы: сначала запрашиваем GPS пользователя
window.onload = () => {
    const statusDiv = document.getElementById('status');

    if (!navigator.geolocation) {
        statusDiv.innerText = 'Ваш браузер не поддерживает геолокацию.';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            loadPlaces(position);
        },
        (err) => {
            statusDiv.innerText = 'Не удалось получить GPS. Разрешите доступ к геолокации.';
            console.error(err);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 27000
        }
    );
};