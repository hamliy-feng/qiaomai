# 地图数据

- Natural Earth 1:110m admin 0 countries；Public Domain。
- 来源：https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- 许可：https://www.naturalearthdata.com/about/terms-of-use/
- world.json 是原始 GeoJSON，world.js 是同内容的本地脚本封装，支持 file:// 无服务打开。
- map.js 中固定坐标仅为 Demo 城市级示意点，不进入正式地点数据。
- Backend 仅使用 DTO 自带的有效 coordinates: [longitude, latitude]；无坐标不绘制。
- 路线只表示地点关联，不声称为历史航线。
