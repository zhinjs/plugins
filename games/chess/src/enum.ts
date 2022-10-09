/**棋子阵营类型（红、黑方） */
enum CampType {
	RED = "红方",
	BLACK = "黑方"
}

/**棋子类型（兵、卒等） */
enum PieceType {
	BING = "兵",
	ZU = "卒",
	JIANG = "將",
	SHUAI = "帥",
	JU = "車",
	PAO = "炮",
	RSHI = "仕",//红方
	BSHI = "士",//黑方
	RXIANG = "相",
	BXIANG = "象",
	MA = "馬"
}

export { CampType, PieceType }