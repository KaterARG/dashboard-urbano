# Dashboard Urbano Store

Dashboard local para leer una copia del Master de Urbano Store.

## Privacidad y seguridad

- El dashboard no contiene API keys, IDs de Google Sheets ni credenciales.
- El Master se carga manualmente desde el navegador y no se envía a ningún servidor.
- No se muestran clientes ni otros datos personales en la interfaz.
- Nunca publicar una hoja `VENTAS`, `CAJA`, `STOCK` o `RECETAS` en Google Sheets para alimentar este sitio.

## Métricas

El dashboard muestra el mes calendario actual del archivo cargado:

- **Facturación bruta:** `SubTotal` (o `Facturación` si no existe esa columna).
- **Neto registrado:** `Total Neto`.
- **Ganancia registrada:** columna `Ganancia`, sin volver a descontar publicidad.
- **Publicidad registrada:** columna `Publicidad`.

Estas métricas son de control operativo. Para decisiones comerciales, conciliá antes las ventas con Mercado Libre y verificá que las fórmulas del Master estén actualizadas.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Despliegue

Al fusionar cambios en `main`, GitHub Actions compila el proyecto y actualiza la rama `gh-pages`. El sitio publicado sólo contiene el código estático de este lector local; nunca lleva una copia del Master.
