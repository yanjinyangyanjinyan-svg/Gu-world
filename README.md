# Gu-world
# 五域两天 · 蛊师世界平台 v2.0

部署方法：
1. 解压本 ZIP。
2. 把 `index.html`、`style.css`、`app.js`、`images` 文件夹全部上传到 GitHub 仓库。
3. 开启 GitHub Pages：Settings → Pages → Deploy from branch → main / root。
4. 打开网址即可使用。

图片使用：
- 蛊虫图片放：images/gu/文件名.png
- 杀招图片放：images/skills/文件名.png
- 凡蛊屋图片放：images/houses/文件名.png
- 势力徽记放：images/sects/文件名.png
- 人物头像放：images/avatars/文件名.png

在新增/编辑时填写路径，例如：images/gu/fengrengu.png

说明：
- 已接入 Firebase Authentication 匿名登录与 Firestore 实时数据库。
- 未使用 Firebase Storage，所以完全免费，不需要升级付费计划。
- 普通玩家只能编辑自己的基础资料；管理员口令默认为 yunchenguo，可在 app.js 里修改。
