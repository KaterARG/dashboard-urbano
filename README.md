# Dashboard Urbano Store

Dashboard público con indicadores agregados del negocio.

## Privacidad y seguridad

- El dashboard no contiene API keys, IDs de Google Sheets ni credenciales.
- El sitio sólo descarga `public/dashboard-data.json`, un resumen anónimo versionado en el repositorio.
- El resumen excluye clientes, IDs de órdenes, destinos, caja, compras, recetas, costos y cantidades de stock.
- Nunca publicar una hoja `VENTAS`, `CAJA`, `STOCK` o `RECETAS` en Google Sheets ni dentro del repositorio.

## Métricas

El dashboard muestra el mes calendario del último movimiento incluido en el resumen:

- **Facturación bruta:** `SubTotal` (o `Facturación` si no existe esa columna).
- **Neto registrado:** `Total Neto` agregado.
- **Ganancia registrada:** columna `Ganancia` agregada, sin volver a descontar publicidad.

Estas métricas son de control operativo. Para decisiones comerciales, conciliá antes las ventas con Mercado Libre y verificá que las fórmulas del Master estén actualizadas.

## Actualizar el resumen público

Desde la copia local de este repositorio, luego de conciliar el Master:

```bash
python tools/generate_public_dashboard.py /ruta/privada/al/master_snapshot.json \
  --output public/dashboard-data.json
git add public/dashboard-data.json
git commit -m "Actualizar resumen público"
git push
```

El script está diseñado para que el archivo generado sea el único dato de negocio que se publica. Revisá el diff antes de hacer `push`.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Despliegue

Al fusionar cambios en `main`, GitHub Actions compila el proyecto y actualiza la rama `gh-pages`. El sitio publicado contiene código estático y el resumen anónimo, nunca una copia del Master.
